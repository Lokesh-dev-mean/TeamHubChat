const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const config = require('../config/environment');
const { prisma } = require('../utils/prisma');
const { convertBigIntToNumber, parseJsonFields } = require('../utils/serialization');
const { createError } = require('../utils/errors');

// Initialize OAuth clients
const googleClient = config.oauth.google.enabled 
  ? new OAuth2Client(
      config.oauth.google.clientId,
      config.oauth.google.clientSecret,
      config.oauth.google.callbackUrl
    )
  : null;

class AuthService {
  // Token generation and validation
  generateToken(userId, tenantId) {
    return jwt.sign({ userId, tenantId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  async verifyToken(token) {
    if (!token) {
      throw createError.validation('Token is required');
    }
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      if (!decoded.userId || !decoded.tenantId) {
        throw createError.authentication('Invalid token format');
      }
      return decoded;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw createError.authentication('Invalid token signature');
      } else if (error.name === 'TokenExpiredError') {
        throw createError.authentication('Token has expired');
      }
      throw error;
    }
  }

  // Password handling
  async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  // User data formatting
  formatUserResponse(user) {
    const { passwordHash, ...userData } = user;
    return {
      ...userData,
      tenant: user.tenant ? {
        ...user.tenant,
        settings: parseJsonFields(user.tenant.settings)
      } : null
    };
  }

  // Core authentication methods
  async registerWithEmail(email, password, displayName, tenantData) {
    // Ensure user does not already exist
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw createError.conflict('An account with this email already exists');
    }

    if (!tenantData?.tenantName) {
      throw createError.validation('Organization details required for registration');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create tenant with default settings
      const slug = await this.generateUniqueSlug(tenantData.tenantName);
      const tenant = await tx.tenant.create({
        data: {
          name: tenantData.tenantName,
          slug,
          settings: {
            create: config.tenant.defaultSettings,
          },
        },
      });

      // Create admin user in the new tenant
      const user = await tx.user.create({
        data: {
          email,
          displayName,
          role: 'admin',
          isActive: true,
          tenantId: tenant.id,
          lastLoginAt: new Date(),
          onlineStatus: 'online',
          lastSeenAt: new Date(),
          passwordHash: await this.hashPassword(password),
        },
        include: {
          tenant: {
            include: { settings: true },
          },
        },
      });

      // Audit log for registration
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: 'USER_REGISTER',
          targetId: user.id,
          context: 'Email registration with organization creation',
        },
      });

      return user;
    });

    const token = this.generateToken(result.id, result.tenantId);
    // Mark first user so frontend can show invite dialog
    return {
      user: { ...this.formatUserResponse(result), isFirstUser: true },
      token,
    };
  }
  async loginWithEmail(email, password) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: {
          include: {
            settings: true
          }
        }
      }
    });

    if (!user) {
      throw createError.authentication('Invalid credentials');
    }

    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw createError.authentication('Invalid credentials');
    }

    if (!user.isActive) {
      throw createError.authorization('Account is deactivated. Please contact your administrator.');
    }

    await this.updateLastLogin(user.id);
    await this.createLoginAuditLog(user.id, user.tenantId, 'Email login');
    
    // Update user status to online
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          onlineStatus: 'online',
          lastSeenAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating user status on login:', error);
      // Don't fail login if status update fails
    }
  
    const token = this.generateToken(user.id, user.tenantId);
    return {
      user: this.formatUserResponse(user),
      token
    };
  }


  // Fetch current user by id
  async getCurrentUser(userId) {
    if (!userId) {
      throw createError.validation('User ID is required');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          include: { settings: true }
        }
      }
    });

    if (!user) {
      throw createError.notFound('User not found');
    }

    return this.formatUserResponse(user);
  }



  // Invitation flow
  async getInvitationDetails(inviteToken) {
    if (!inviteToken) {
      throw createError.validation('Invalid invitation token');
    }

    const invitation = await prisma.invitation.findUnique({
      where: { inviteToken },
      include: {
        tenant: true,
        invitedBy: true
      }
    });

    if (!invitation) {
      throw createError.notFound('Invalid invitation token');
    }

    // Check invitation status
    if (invitation.status === 'revoked') {
      throw createError.validation('This invitation has been revoked. Please contact the organization administrator for a new invitation.');
    }

    // Check expiration
    if (invitation.status !== 'pending' || new Date(invitation.expiresAt) < new Date()) {
      if (invitation.status === 'pending' && new Date(invitation.expiresAt) < new Date()) {
        await prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'expired' } });
      }
      throw createError.validation('This invitation has expired. Please contact the organization administrator for a new invitation.');
    }

    let permissions = [];
    try { permissions = JSON.parse(invitation.permissions || '[]'); } catch {}

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      permissions,
      expiresAt: invitation.expiresAt,
      tenant: { id: invitation.tenantId, name: invitation.tenant?.name }
    };
  }

  async acceptInvitation(inviteToken, password, displayName) {
    if (!inviteToken) {
      throw createError.validation('Invalid invitation token');
    }
    if (!password || password.length < 8) {
      throw createError.validation('Password must be at least 8 characters long');
    }

    const invitation = await prisma.invitation.findUnique({
      where: { inviteToken },
      include: { tenant: true }
    });

    if (!invitation) {
      throw createError.notFound('Invalid invitation token');
    }

    if (invitation.status !== 'pending') {
      throw createError.validation('Invitation already processed');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'expired' } });
      throw createError.validation('Invitation has expired');
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (existingUser) {
      // If user already exists, move/update them into this tenant and reset role/password
      const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            tenantId: invitation.tenantId,
            role: invitation.role || existingUser.role,
            isActive: true,
            displayName: displayName || existingUser.displayName || invitation.email.split('@')[0],
            passwordHash: await this.hashPassword(password),
            lastLoginAt: new Date()
          },
          include: { tenant: { include: { settings: true } } }
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'accepted', acceptedAt: new Date() }
        });

        await tx.auditLog.create({
          data: {
            tenantId: invitation.tenantId,
            userId: user.id,
            action: 'INVITATION_ACCEPTED',
            targetId: invitation.id,
            context: `Existing user joined via invitation for ${invitation.email}`
          }
        });

        return user;
      });

      const token = this.generateToken(updated.id, updated.tenantId);
      return { user: this.formatUserResponse(updated), token };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create user in tenant
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          displayName: displayName || invitation.email.split('@')[0],
          role: invitation.role || 'member',
          isActive: true,
          tenantId: invitation.tenantId,
          lastLoginAt: new Date(),
          passwordHash: await this.hashPassword(password)
        },
        include: { tenant: { include: { settings: true } } }
      });

      // Update invitation
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted', acceptedAt: new Date() }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId: invitation.tenantId,
          userId: user.id,
          action: 'INVITATION_ACCEPTED',
          targetId: invitation.id,
          context: `User accepted invitation for ${invitation.email}`
        }
      });

      return user;
    });

    const token = this.generateToken(result.id, result.tenantId);
    // Realtime: notify tenant of acceptance
    try {
      const { io } = require('../server');
      if (io) {
        io.to(result.tenantId).emit('invitation-accepted', {
          user: {
            id: result.id,
            email: result.email,
            displayName: result.displayName,
            role: result.role,
            isActive: result.isActive,
            createdAt: result.createdAt,
            lastLoginAt: result.lastLoginAt
          }
        });
      }
    } catch {}

    return { user: this.formatUserResponse(result), token };
  }

  // OAuth methods
  async handleMicrosoftAuth(accessToken, tenantData) {
    if (!config.oauth.microsoft.enabled) {
      throw createError.server('Microsoft OAuth is not configured');
    }

    try {
      // Get user info from Microsoft Graph API
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const { mail: email, displayName: name } = response.data;

      if (!email) {
        throw createError.validation('Email not available from Microsoft account');
      }

      let user = await prisma.user.findUnique({
        where: { email },
        include: {
          tenant: {
            include: {
              settings: true
            }
          }
        }
      });

      if (user) {
        if (!user.isActive) {
          throw createError.authorization('Account is deactivated. Please contact your administrator.');
        }
        if ( tenantData?.tenantName) {
          throw createError.conflict('An account already exists for this email. Please sign in instead of creating a new organization.');
        }
        await this.updateLastLogin(user.id);
        await this.createLoginAuditLog(user.id, user.tenantId, 'Microsoft OAuth login');
        
        // Update user status to online
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              onlineStatus: 'online',
              lastSeenAt: new Date()
            }
          });
        } catch (error) {
          console.error('Error updating user status on Microsoft OAuth login:', error);
          // Don't fail login if status update fails
        }
        
        const token = this.generateToken(user.id, user.tenantId);
        return {
          user: this.formatUserResponse(user),
          token
        };
      }

      // Create new user if tenant data is provided
      if (tenantData) {
        const { tenantName } = tenantData;

        // Create tenant and user
        const result = await prisma.$transaction(async (prisma) => {
          const slug = await this.generateUniqueSlug(tenantName);
          const tenant = await prisma.tenant.create({
            data: {
              name: tenantName,
              slug,
              settings: {
                create: config.tenant.defaultSettings
              }
            }
          });

          const user = await prisma.user.create({
            data: {
              email,
              displayName: name,
              role: 'admin',
              isActive: true,
              tenantId: tenant.id,
              lastLoginAt: new Date(),
              onlineStatus: 'online',
              lastSeenAt: new Date(),
              passwordHash: await this.hashPassword(Math.random().toString(36).slice(-8))
            },
            include: {
              tenant: {
                include: {
                  settings: true
                }
              }
            }
          });

          // Create audit log within the transaction
          await prisma.auditLog.create({
            data: {
              tenantId: tenant.id,
              userId: user.id,
              action: 'USER_LOGIN',
              targetId: user.id,
              context: 'Microsoft OAuth registration'
            }
          });

          return user;
        });

        const token = this.generateToken(result.id, result.tenantId);
        return {
          user: this.formatUserResponse(result),
          token
        };
      }

      throw createError.validation('Organization details required for registration');
    } catch (error) {
      if (error.response?.status === 401) {
        throw createError.authentication('Invalid Microsoft access token');
      }
      throw error;
    }
  }

  async handleGoogleAuth(token, tenantData) {
    if (!config.oauth.google.enabled || !googleClient) {
      throw createError.server('Google OAuth is not configured');
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: config.oauth.google.clientId
    });

    const { email, name, picture, email_verified } = ticket.getPayload();

    if (!email_verified) {
      throw createError.validation('Google email is not verified');
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: {
          include: {
            settings: true
          }
        }
      }
    });

    if (user) {
      if (!user.isActive) {
        throw createError.authorization('Account is deactivated. Please contact your administrator.');
      }
      if (tenantData?.tenantName) {
        throw createError.conflict('An account already exists for this email. Please sign in instead of creating a new organization.');
      }
      await this.updateLastLogin(user.id);
      await this.createLoginAuditLog(user.id, user.tenantId, 'Google OAuth login');
      
      // Update user status to online
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            onlineStatus: 'online',
            lastSeenAt: new Date()
          }
        });
      } catch (error) {
        console.error('Error updating user status on Google OAuth login:', error);
        // Don't fail login if status update fails
      }
      
      const token = this.generateToken(user.id, user.tenantId);
      return {
        user: this.formatUserResponse(user),
        token
      };
    }

    // Create new user if tenant data is provided
    if (tenantData) {
      const { tenantName } = tenantData;



      // Create tenant and user
      const result = await prisma.$transaction(async (prisma) => {
        const slug = await this.generateUniqueSlug(tenantName);
        const tenant = await prisma.tenant.create({
          data: {
            name: tenantName,
            slug,
            settings: {
              create: config.tenant.defaultSettings
            }
          }
        });

                  const user = await prisma.user.create({
            data: {
              email,
              displayName: name,
              avatarUrl: picture,
              role: 'admin',
              isActive: true,
              tenantId: tenant.id,
              lastLoginAt: new Date(),
              onlineStatus: 'online',
              lastSeenAt: new Date(),
              passwordHash: await this.hashPassword(Math.random().toString(36).slice(-8))
            },
            include: {
              tenant: {
                include: {
                  settings: true
                }
              }
            }
          });

          // Create audit log within the transaction
          await prisma.auditLog.create({
            data: {
              tenantId: tenant.id,
              userId: user.id,
              action: 'USER_LOGIN',
              targetId: user.id,
              context: 'Google OAuth registration'
            }
          });

        return user;
      });

      const token = this.generateToken(result.id, result.tenantId);
      return {
        user: this.formatUserResponse(result),
        token
      };
    }

    throw createError.validation('Organization details required for registration');
  }

  // Helper methods
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/([^a-z0-9])+/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/(^-+)|(-+$)/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }

  async generateUniqueSlug(name) {
    let slug = this.generateSlug(name);
    let counter = 1;
    let uniqueSlug = slug;

    // Keep checking until we find a unique slug
    while (true) {
      const existing = await prisma.tenant.findUnique({
        where: { slug: uniqueSlug }
      });

      if (!existing) {
        return uniqueSlug;
      }

      // If slug exists, append a number and try again
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }

  async logout(userId) {
    try {
      // Check database connection first
      await prisma.$queryRaw`SELECT 1`;
      console.log(`✅ Database connection verified for logout of user ${userId}`);
      
      // Update last login time to mark the session end
      await this.updateLastLogin(userId);
      
      // Update user status to offline
      await prisma.user.update({
        where: { id: userId },
        data: { 
          onlineStatus: 'offline',
          lastSeenAt: new Date()
        }
      });
      
      console.log(`✅ User ${userId} logged out successfully`);
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Try to update just the status if the lastLogin update fails
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { 
            onlineStatus: 'offline',
            lastSeenAt: new Date()
          }
        });
        console.log(`✅ User ${userId} status updated to offline despite login update failure`);
      } catch (statusError) {
        console.error('Error updating user status on logout:', statusError);
        // Don't fail logout if both operations fail
      }
    }
  }

  async exchangeGoogleCode(code, redirectUri) {
    if (!config.oauth.google.enabled || !googleClient) {
      throw createError.server('Google OAuth is not configured');
    }

    if (!code) {
      throw createError.validation('Authorization code is required');
    }

    if (!redirectUri) {
      throw createError.validation('Redirect URI is required');
    }

    try {
      const { tokens } = await googleClient.getToken({
        code,
        redirect_uri: redirectUri
      });

      if (!tokens || !tokens.id_token) {
        throw createError.validation('Invalid response from Google OAuth');
      }

      return {
        success: true,
        data: {
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expiry_date
        }
      };
    } catch (error) {
      console.error('Google code exchange error:', error);
      
      if (error.response?.data?.error === 'invalid_grant') {
        throw createError.validation('Invalid or expired authorization code');
      } else if (error.response?.data?.error === 'redirect_uri_mismatch') {
        throw createError.validation('Redirect URI mismatch');
      }
      
      throw createError.validation(error.message || 'Failed to exchange authorization code');
    }
  }

  async updateLastLogin(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() }
      });
      console.log(`✅ Last login updated for user ${userId}`);
    } catch (error) {
      console.error(`❌ Error updating last login for user ${userId}:`, error);
      throw error; // Re-throw to be handled by caller
    }
  }

  async createLoginAuditLog(userId, tenantId, context) {
    if (tenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'USER_LOGIN',
          targetId: userId,
          context
        }
      });
    }
  }
}

module.exports = new AuthService();
