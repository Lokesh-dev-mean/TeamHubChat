const { validationResult } = require('express-validator');
const { prisma } = require('../utils/prisma');

/**
 * Get all users
 * @route GET /api/users
 * @access Private
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { tenantId } = req;
    const { search, role, isActive, page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;
    const whereClause = {
      tenantId,
      deletedAt: null
    };

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

    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
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
          lastSeenAt: true,
          onlineStatus: true,
          createdAt: true,
          _count: {
            select: {
              messages: true,
              mediaFiles: true,
              conversationsCreated: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where: whereClause })
    ]);

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
 * Get user by ID
 * @route GET /api/users/:id
 * @access Private
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req;

    const user = await prisma.user.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        lastSeenAt: true,
        onlineStatus: true,
        phoneNumber: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
            slug: true
          }
        },
        roleAssignments: {
          select: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        name: true,
                        description: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            messages: true,
            mediaFiles: true,
            conversationsCreated: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/users/:id
 * @access Private
 */
exports.updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { userId, tenantId } = req;
    const { displayName, email, avatarUrl, phoneNumber } = req.body;

    // Check if user exists and belongs to the same tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is updating their own profile or is an admin
    if (userId !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    // Check if email is being updated and is unique
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          tenantId,
          id: { not: id },
          deletedAt: null
        }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Build update object with only provided fields
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (email) updateData.email = email;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        lastSeenAt: true,
        onlineStatus: true,
        phoneNumber: true,
        createdAt: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'USER_UPDATED',
        targetId: id,
        context: `User profile updated: ${Object.keys(updateData).join(', ')}`
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
};

/**
 * Update user status
 * @route PUT /api/users/status/:id
 * @access Private
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { userId, tenantId } = req;
    const { onlineStatus } = req.body;

    // Check if user exists and belongs to the same tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is updating their own status
    if (userId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this status'
      });
    }

    if (!['online', 'offline', 'away', 'busy'].includes(onlineStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        onlineStatus,
        lastSeenAt: new Date()
      },
      select: {
        id: true,
        displayName: true,
        onlineStatus: true,
        lastSeenAt: true
      }
    });

    // Emit real-time status update
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(tenantId).emit('user-status-changed', {
          userId: id,
          onlineStatus,
          lastSeenAt: updatedUser.lastSeenAt
        });
      }
    } catch (error) {
      console.error('Failed to emit status change:', error);
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating status'
    });
  }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, tenantId } = req;

    // Check if user exists and belongs to the same tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is an admin or deleting their own account
    if (userId !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this user'
      });
    }

    // Don't allow admins to delete themselves
    if (userId === id && req.user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own admin account'
      });
    }

    // Soft delete user
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        onlineStatus: 'offline'
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.user.id,
        action: 'USER_DELETED',
        targetId: id,
        context: `User ${existingUser.email} deleted`
      }
    });

    // Emit real-time user deletion
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(tenantId).emit('user-deleted', {
          userId: id,
          email: existingUser.email
        });
      }
    } catch (error) {
      console.error('Failed to emit user deletion:', error);
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
};
