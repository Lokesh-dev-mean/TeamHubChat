const { validationResult } = require('express-validator');
const authService = require('../services/auth.service');
const { prisma } = require('../utils/prisma');

class AuthController {
  // Email authentication
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, displayName, tenantName } = req.body;
      const tenantData = tenantName ? { tenantName } : undefined;
      const result = await authService.registerWithEmail(email, password, displayName, tenantData);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result
      });
    } catch (error) {
      console.error('Registration error:', error);
      const status = (error.message.includes('already exists') || error.errorCode === 'CONFLICT_ERROR') ? 400 : 500;
      
      res.status(status).json({
        success: false,
        message: error.message || 'Server error during registration'
      });
    }
  }
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;
      
      // Check rate limiting before proceeding
      const ipAddress = req.ip;
      const rateLimitWindow = 15 * 60; // 15 minutes in seconds
      const maxAttempts = 5;

      const recentAttempts = await prisma.rateLimitLog.count({
        where: {
          ipAddress,
          endpoint: '/auth/login',
          method: 'POST',
          timestamp: {
            gte: new Date(Date.now() - rateLimitWindow * 1000)
          }
        }
      });

      if (recentAttempts >= maxAttempts) {
        const oldestAttempt = await prisma.rateLimitLog.findFirst({
          where: {
            ipAddress,
            endpoint: '/auth/login',
            method: 'POST'
          },
          orderBy: { timestamp: 'asc' }
        });

        const resetTime = new Date(oldestAttempt.timestamp.getTime() + rateLimitWindow * 1000);
        
        // Log the rate limit hit
        await prisma.rateLimitLog.create({
          data: {
            ipAddress,
            endpoint: '/auth/login',
            method: 'POST',
            userAgent: req.get('user-agent'),
            limit: maxAttempts,
            current: recentAttempts + 1,
            ttl: rateLimitWindow,
            resetAt: resetTime
          }
        });

        return res.status(429).json({
          success: false,
          message: 'Too many login attempts. Please try again later.',
          resetAt: resetTime
        });
      }

      const result = await authService.loginWithEmail(email, password);

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(error.message === 'Invalid credentials' ? 401 : 500).json({
        success: false,
        message: error.message || 'Server error during login'
      });
    }
  }



  // OAuth authentication
  async googleAuth(req, res) {
    try {
      const { token, tenantName } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Google token is required'
        });
      }

      const tenantData = tenantName ? { tenantName } : undefined;
      const result = await authService.handleGoogleAuth(token, tenantData);

      res.json({
        success: true,
        message: 'Google authentication successful',
        data: result
      });
    } catch (error) {
      console.error('Google auth error:', error);
      const status = (
        error.message.includes('not configured') ||
        error.message.includes('not verified') ||
        error.message.includes('already taken') ||
        error.message.includes('already exists') ||
        error.message.includes('Organization details required')
      ) ? 400 : 500;

      const message = error.message.includes('Organization details required')
        ? 'Let’s set up your organization to get you started with Google.'
        : (error.message || 'Server error during Google authentication');

      res.status(status).json({
        success: false,
        message
      });
    }
  }

  async microsoftAuth(req, res) {
    try {
      const { accessToken, tenantName } = req.body;

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          message: 'Microsoft access token is required'
        });
      }

      const tenantData = tenantName ? { tenantName } : undefined;
      const result = await authService.handleMicrosoftAuth(accessToken, tenantData);

      res.json({
        success: true,
        message: 'Microsoft authentication successful',
        data: result
      });
    } catch (error) {
      console.error('Microsoft auth error:', error);
      const status = (
        error.message.includes('not configured') ||
        error.message.includes('not verified') ||
        error.message.includes('already taken') ||
        error.message.includes('already exists') ||
        error.message.includes('Organization details required')
      ) ? 400 : 500;

      const message = error.message.includes('Organization details required')
        ? 'Let’s set up your organization to get you started with Microsoft.'
        : (error.message || 'Server error during Microsoft authentication');

      res.status(status).json({
        success: false,
        message
      });
    }
  }

  async googleExchangeCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { code, redirectUri } = req.body;
      const result = await authService.exchangeGoogleCode(code, redirectUri);

      // Flatten consistent response for frontend
      res.json({
        success: true,
        message: 'Authorization code exchanged successfully',
        idToken: result?.data?.idToken,
        accessToken: result?.data?.accessToken
      });
    } catch (error) {
      console.error('Google code exchange error:', error);
      res.status(error.message.includes('Invalid code') ? 400 : 500).json({
        success: false,
        message: error.message || 'Server error during code exchange'
      });
    }
  }

  async logout(req, res) {
    try {
      console.log(`🔍 Logout request for user: ${req.userId}`);
      
      // Add timeout to prevent hanging
      const logoutPromise = authService.logout(req.userId);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Logout timeout')), 10000); // 10 second timeout
      });
      
      await Promise.race([logoutPromise, timeoutPromise]);
      
      console.log(`✅ Logout completed successfully for user: ${req.userId}`);
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      // If it's a timeout, still try to update the status
      if (error.message === 'Logout timeout') {
        try {
          // Force update user status to offline
          const { prisma } = require('../utils/prisma');
          await prisma.user.update({
            where: { id: req.userId },
            data: { 
              onlineStatus: 'offline',
              lastSeenAt: new Date()
            }
          });
          console.log(`✅ User ${req.userId} status force-updated to offline after timeout`);
        } catch (statusError) {
          console.error('Error force-updating user status after timeout:', statusError);
        }
      }
      
      // Always try to send a response, even if it's an error
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message || 'Server error during logout'
        });
      } else {
        console.error('Response already sent, cannot send error response');
      }
    }
  }

  async getCurrentUser(req, res) {
    try {
      console.log('🔍 getCurrentUser - Start');
      console.log('📄 Request details:', {
        userId: req.userId,
        tenantId: req.tenantId,
        headers: {
          authorization: req.headers.authorization ? 'Present' : 'Missing'
        }
      });

      if (!req.userId) {
        console.log('❌ User ID not found in request');
        return res.status(401).json({
          success: false,
          message: 'User ID not found in request'
        });
      }
      console.log('✅ User ID found:', req.userId);

      console.log('🔍 Finding user in database...');
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
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
          }
        }
      });

      if (!user) {
        console.log('❌ User not found in database');
        throw new Error('User not found');
      }
      console.log('✅ User found:', { id: user.id, email: user.email });

      // Update last seen timestamp
      console.log('⏰ Updating last seen timestamp...');
      await prisma.user.update({
        where: { id: req.userId },
        data: { lastSeenAt: new Date() }
      });
      console.log('✅ Last seen timestamp updated');

      console.log('📤 Preparing response data...');
      const responseData = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            permissions: user.permissions,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            lastSeenAt: user.lastSeenAt,
            onlineStatus: user.onlineStatus,
            phoneNumber: user.phoneNumber,
            tenant: user.tenant,
            roleAssignments: user.roleAssignments
          }
        }
      };
      console.log('📤 Sending response...');
      res.json(responseData);
      console.log('✅ Response sent successfully');
    } catch (error) {
      console.error('Get current user error:', error);
      const status = error.message === 'User not found' ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message || 'Server error while fetching user'
      });
    }
  }



  async getInvitationDetails(req, res) {
    try {
      const { inviteToken } = req.params;
      const invitation = await authService.getInvitationDetails(inviteToken);

      res.json({
        success: true,
        message: 'Invitation details retrieved',
        data: { invitation }
      });
    } catch (error) {
      console.error('Get invitation details error:', error);
      const status = error.statusCode || (error.message.includes('Invalid') ? 404 : 500);
      res.status(status).json({
        success: false,
        message: error.message || 'Server error while fetching invitation'
      });
    }
  }

  async acceptInvitation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { inviteToken } = req.params;
      const { password, displayName } = req.body;
      const result = await authService.acceptInvitation(inviteToken, password, displayName);

      res.status(201).json({
        success: true,
        message: 'Successfully joined organization',
        data: result
      });
    } catch (error) {
      console.error('Accept invitation error:', error);
      const status = error.message.includes('Invalid') || error.message.includes('exists') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message || 'Server error while accepting invitation'
      });
    }
  }



  // Token validation
  async validateToken(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    try {
      const decoded = await authService.verifyToken(token);
      res.json({
        success: true,
        data: decoded
      });
    } catch (error) {
      const status = error.message === 'Token is required' ? 400 : 401;
      res.status(status).json({
        success: false,
        message: error.message || 'Invalid token'
      });
    }
  }
}

module.exports = new AuthController();