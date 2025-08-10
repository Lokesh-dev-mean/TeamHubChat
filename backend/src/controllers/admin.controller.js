const prisma = require('../utils/prisma');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const config = require('../config/environment');
const { sendInviteEmail } = require('../services/email.service');

/**
 * Get tenant dashboard stats
 * @route GET /api/admin/dashboard
 * @access Admin
 */
const getDashboardStats = async (req, res) => {
  try {
    const { tenantId } = req;

    // Get basic counts
    const [
      totalUsers,
      activeUsers,
      totalConversations,
      totalMessages,
      totalFiles,
      storageUsed
    ] = await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.user.count({ 
        where: { 
          tenantId,
          isActive: true,
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.conversation.count({ where: { tenantId } }),
      prisma.message.count({
        where: {
          conversation: { tenantId },
          deletedAt: null
        }
      }),
      prisma.mediaFile.count({ where: { tenantId } }),
      prisma.mediaFile.aggregate({
        where: { tenantId },
        _sum: { size: true }
      })
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        tenantId,
        createdAt: { gte: sevenDaysAgo }
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get user growth data (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const userGrowth = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        tenantId,
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: true,
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          totalConversations,
          totalMessages,
          totalFiles,
          storageUsed: storageUsed._sum.size ? storageUsed._sum.size.toString() : '0'
        },
        recentActivity,
        userGrowth
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard stats'
    });
  }
};

/**
 * Get all users in tenant
 * @route GET /api/admin/users
 * @access Admin
 */
const getAllUsers = async (req, res) => {
  try {
    const { tenantId } = req;
    const { page = 1, limit = 20, role, isActive, search } = req.query;

    const skip = (page - 1) * limit;
    const whereClause = { tenantId };

    // Filter by role
    if (role) {
      whereClause.role = role;
    }

    // Filter by active status
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Search by name or email
    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      whereClause.OR = [
        {
          displayName: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        }
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            messages: true,
            mediaFiles: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    const totalUsers = await prisma.user.count({ where: whereClause });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
          hasMore: skip + users.length < totalUsers
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

/**
 * Update user role and permissions
 * @route PUT /api/admin/users/:userId/role
 * @access Admin
 */
const updateUserRole = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { role, permissions = [] } = req.body;
    const { tenantId, userId: adminUserId } = req;

    // Check if target user exists and belongs to the same tenant
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow admins to change their own role
    if (userId === adminUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    // Update user role and permissions
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        permissions
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        permissions: true,
        isActive: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminUserId,
        action: 'USER_ROLE_UPDATED',
        targetId: userId,
        context: `Updated user role to ${role} with permissions: ${permissions.join(', ')}`
      }
    });

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user role'
    });
  }
};

/**
 * Deactivate/activate user
 * @route PUT /api/admin/users/:userId/status
 * @access Admin
 */
const updateUserStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { isActive } = req.body;
    const { tenantId, userId: adminUserId } = req;

    // Check if target user exists and belongs to the same tenant
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow admins to deactivate themselves
    if (userId === adminUserId && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminUserId,
        action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        targetId: userId,
        context: `User ${isActive ? 'activated' : 'deactivated'}`
      }
    });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user status'
    });
  }
};

/**
 * Send user invitation
 * @route POST /api/admin/invitations
 * @access Admin
 */
const sendInvitation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, role = 'member', permissions = [] } = req.body;
    const { tenantId, userId } = req;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        tenantId
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists in the organization'
      });
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        tenantId,
        status: 'pending'
      }
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'Pending invitation already exists for this email'
      });
    }

    // Generate invitation token
    const inviteToken = crypto.randomBytes(config.invitation.tokenLength).toString('hex');
    const expiresAt = new Date(Date.now() + config.invitation.expiresInDays * 24 * 60 * 60 * 1000);

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        tenantId,
        email,
        role,
        permissions: Array.isArray(permissions)
          ? JSON.stringify(permissions)
          : (typeof permissions === 'string' ? permissions : '[]'),
        inviteToken,
        invitedById: userId,
        expiresAt
      },
      include: {
        tenant: {
          select: {
            name: true
          }
        },
        invitedBy: {
          select: {
            displayName: true,
            email: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'INVITATION_SENT',
        targetId: invitation.id,
        context: `Invitation sent to ${email} with role ${role}`
      }
    });

    // Emit realtime event for pending invitation
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(tenantId).emit('invitation-created', {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
            inviteToken: invitation.inviteToken
          }
        });
      }
    } catch {}

    // Send invitation email (non-blocking for API success)
    try {
      const inviteUrl = `${config.frontend.url}/invite/${invitation.inviteToken}`;
      await sendInviteEmail({
        to: invitation.email,
        inviteUrl,
        tenantName: invitation.tenant.name,
        invitedByName: invitation.invitedBy.displayName || 'An administrator'
      });
    } catch (emailError) {
      console.error('Failed to send invitation email via Brevo:', emailError);
      // Do not fail the API response because email dispatch failed
    }

    // Return the invitation details
    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          permissions: (() => { try { return JSON.parse(invitation.permissions); } catch { return []; } })(),
          inviteToken: invitation.inviteToken,
          expiresAt: invitation.expiresAt,
          inviteUrl: `${config.frontend.url}/invite/${invitation.inviteToken}`
        }
      }
    });

  } catch (error) {
    console.error('Send invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending invitation'
    });
  }
};

/**
 * Get all invitations
 * @route GET /api/admin/invitations
 * @access Admin
 */
const getInvitations = async (req, res) => {
  try {
    const { tenantId } = req;
    const { page = 1, limit = 20, status } = req.query;

    const skip = (page - 1) * limit;
    const whereClause = { tenantId };

    if (status) {
      whereClause.status = status;
    }

    const invitations = await prisma.invitation.findMany({
      where: whereClause,
      include: {
        invitedBy: {
          select: {
            displayName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    const totalInvitations = await prisma.invitation.count({ where: whereClause });

    res.json({
      success: true,
      data: {
        invitations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalInvitations,
          totalPages: Math.ceil(totalInvitations / limit),
          hasMore: skip + invitations.length < totalInvitations
        }
      }
    });

  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching invitations'
    });
  }
};

/**
 * Revoke invitation
 * @route DELETE /api/admin/invitations/:invitationId
 * @access Admin
 */
const revokeInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const { tenantId, userId } = req;

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        tenantId,
        status: 'pending'
      }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or already processed'
      });
    }

    // Update invitation status
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'revoked' }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'INVITATION_REVOKED',
        targetId: invitationId,
        context: `Invitation revoked for ${invitation.email}`
      }
    });

    res.json({
      success: true,
      message: 'Invitation revoked successfully'
    });

  } catch (error) {
    console.error('Revoke invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while revoking invitation'
    });
  }
};

/**
 * Get audit logs
 * @route GET /api/admin/audit-logs
 * @access Admin
 */
const getAuditLogs = async (req, res) => {
  try {
    const { tenantId } = req;
    const { 
      page = 1, 
      limit = 50, 
      action, 
      userId, 
      startDate, 
      endDate 
    } = req.query;

    const skip = (page - 1) * limit;
    const whereClause = { tenantId };

    // Filter by action
    if (action) {
      whereClause.action = action;
    }

    // Filter by user
    if (userId) {
      whereClause.userId = userId;
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            displayName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    const totalLogs = await prisma.auditLog.count({ where: whereClause });

    res.json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalLogs,
          totalPages: Math.ceil(totalLogs / limit),
          hasMore: skip + auditLogs.length < totalLogs
        }
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching audit logs'
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  sendInvitation,
  getInvitations,
  revokeInvitation,
  getAuditLogs
};
