const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const config = require('../config/environment');
const prisma = require('../utils/prisma');
const { v4: uuidv4 } = require('uuid');

// Initialize OAuth clients
const googleClient = config.oauth.google.enabled 
  ? new OAuth2Client(config.oauth.google.clientId)
  : null;

// OAuth API URLs
const MICROSOFT_GRAPH_URL = 'https://graph.microsoft.com/v1.0/me';
const GITHUB_API_URL = 'https://api.github.com/user';

// Generate JWT token
const generateToken = (userId, tenantId) => {
  return jwt.sign({ userId, tenantId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

// Hash password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, config.auth.bcryptSaltRounds);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Register new user with email
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, displayName, tenantName, tenantDomain } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create tenant if provided (for organization creators)
    let tenant = null;
    let isFirstUser = false;
    if (tenantName && tenantDomain) {
      // Validate domain format
      if (!/^[a-zA-Z0-9-]+$/.test(tenantDomain)) {
        return res.status(400).json({
          success: false,
          message: 'Domain can only contain letters, numbers, and hyphens'
        });
      }

      // Check if tenant domain already exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { domain: tenantDomain }
      });

      if (existingTenant) {
        return res.status(400).json({
          success: false,
          message: 'Organization domain already exists'
        });
      }

      // Create tenant with default settings
      tenant = await prisma.tenant.create({
        data: {
          name: tenantName,
          domain: tenantDomain,
          settings: {
            create: {
              allowGuestAccess: false,
              requireInviteApproval: true,
              maxFileSize: 52428800, // 50MB
              allowedFileTypes: [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf', 'text/plain', 'application/zip'
              ],
              messageRetentionDays: 365
            }
          }
        },
        include: {
          settings: true
        }
      });
      isFirstUser = true;
    }

    // Create user with appropriate role
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        tenantId: tenant ? tenant.id : null,
        role: isFirstUser ? 'admin' : 'member', // First user becomes admin
        isActive: true,
        lastLoginAt: new Date()
      },
      include: {
        tenant: {
          include: {
            settings: true
          }
        }
      }
    });

    // Generate token
    const token = generateToken(user.id, user.tenantId);

    // Create audit logs
    if (user.tenantId) {
      const auditLogs = [];
      
      if (tenant) {
        auditLogs.push({
          tenantId: user.tenantId,
          userId: user.id,
          action: 'TENANT_CREATED',
          targetId: tenant.id,
          context: `Tenant '${tenant.name}' created with domain '${tenant.domain}'`
        });
      }
      
      auditLogs.push({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'USER_CREATED',
        targetId: user.id,
        context: `User registered with email ${email}${isFirstUser ? ' as admin' : ''}`
      });

      await prisma.auditLog.createMany({
        data: auditLogs
      });
    }

    // Return user data without password
    const userData = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant,
      isFirstUser,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Login user with email
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate token
    const token = generateToken(user.id, user.tenantId);

    // Create audit log
    if (user.tenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'USER_LOGIN',
          targetId: user.id,
          context: 'Email login'
        }
      });
    }

    // Return user data without password
    const userData = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      tenantId: user.tenantId,
      tenant: user.tenant,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Google OAuth login
const googleAuth = async (req, res) => {
  try {
    // Check if Google OAuth is enabled
    if (!config.oauth.google.enabled || !googleClient) {
      return res.status(400).json({
        success: false,
        message: 'Google OAuth is not configured'
      });
    }

    const { token, tenantName, tenantDomain } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: config.oauth.google.clientId
    });

    const payload = ticket.getPayload();
    const { email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Google email is not verified'
      });
    }

    // Check if user exists
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
      // User exists, check if active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact your administrator.'
        });
      }

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Generate token
      const authToken = generateToken(user.id, user.tenantId);

      // Create audit log
      if (user.tenantId) {
        await prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'USER_LOGIN',
            targetId: user.id,
            context: 'Google OAuth login'
          }
        });
      }

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            tenantId: user.tenantId,
            tenant: user.tenant,
            lastLoginAt: new Date(),
            createdAt: user.createdAt
          },
          token: authToken
        }
      });
    }

    // User doesn't exist, create new user
    let tenant = null;
    let isFirstUser = false;
    
    if (tenantName && tenantDomain) {
      // Validate domain format
      if (!/^[a-zA-Z0-9-]+$/.test(tenantDomain)) {
        return res.status(400).json({
          success: false,
          message: 'Domain can only contain letters, numbers, and hyphens'
        });
      }

      // Check if tenant domain already exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { domain: tenantDomain }
      });

      if (existingTenant) {
        return res.status(400).json({
          success: false,
          message: 'Organization domain already exists'
        });
      }

      // Create tenant with default settings
      tenant = await prisma.tenant.create({
        data: {
          name: tenantName,
          domain: tenantDomain,
          settings: {
            create: {
              allowGuestAccess: false,
              requireInviteApproval: true,
              maxFileSize: 52428800, // 50MB
              allowedFileTypes: [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf', 'text/plain', 'application/zip'
              ],
              messageRetentionDays: 365
            }
          }
        },
        include: {
          settings: true
        }
      });
      isFirstUser = true;
    }

    // Create new user with OAuth data
    user = await prisma.user.create({
      data: {
        email,
        displayName: name || email.split('@')[0],
        avatarUrl: picture,
        passwordHash: '', // OAuth users don't have passwords
        tenantId: tenant ? tenant.id : null,
        role: isFirstUser ? 'admin' : 'member', // First user becomes admin
        isActive: true,
        lastLoginAt: new Date()
      },
      include: {
        tenant: {
          include: {
            settings: true
          }
        }
      }
    });

    // Generate token
    const authToken = generateToken(user.id, user.tenantId);

    // Create audit logs
    if (user.tenantId) {
      const auditLogs = [];
      
      if (tenant) {
        auditLogs.push({
          tenantId: user.tenantId,
          userId: user.id,
          action: 'TENANT_CREATED',
          targetId: tenant.id,
          context: `Tenant '${tenant.name}' created via Google OAuth with domain '${tenant.domain}'`
        });
      }
      
      auditLogs.push({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'USER_CREATED',
        targetId: user.id,
        context: `User registered via Google OAuth${isFirstUser ? ' as admin' : ''}`
      });

      await prisma.auditLog.createMany({
        data: auditLogs
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered and logged in successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          tenantId: user.tenantId,
          tenant: user.tenant,
          isFirstUser,
          createdAt: user.createdAt
        },
        token: authToken
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google authentication'
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        tenant: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      tenantId: user.tenantId,
      tenant: user.tenant,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      data: { user: userData }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    // Create audit log
    if (req.tenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId: req.tenantId,
          userId: req.userId,
          action: 'USER_LOGOUT',
          targetId: req.userId,
          context: 'User logout'
        }
      });
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// Microsoft OAuth login
const microsoftAuth = async (req, res) => {
  try {
    // Check if Microsoft OAuth is enabled
    if (!config.oauth.microsoft.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Microsoft OAuth is not configured'
      });
    }

    const { accessToken, tenantName, tenantDomain } = req.body;

    // Get user info from Microsoft Graph API
    const response = await axios.get(MICROSOFT_GRAPH_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const { mail, displayName, userPrincipalName } = response.data;
    const email = mail || userPrincipalName;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Unable to retrieve email from Microsoft account'
      });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true
      }
    });

    if (user) {
      // User exists, log them in
      const authToken = generateToken(user.id, user.tenantId);

      // Create audit log
      if (user.tenantId) {
        await prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'USER_LOGIN',
            targetId: user.id,
            context: 'Microsoft OAuth login'
          }
        });
      }

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            tenantId: user.tenantId,
            tenant: user.tenant,
            createdAt: user.createdAt
          },
          token: authToken
        }
      });
    }

    // User doesn't exist, create new user
    let tenant = null;
    if (tenantName && tenantDomain) {
      // Check if tenant domain already exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { domain: tenantDomain }
      });

      if (existingTenant) {
        return res.status(400).json({
          success: false,
          message: 'Organization domain already exists'
        });
      }

      tenant = await prisma.tenant.create({
        data: {
          name: tenantName,
          domain: tenantDomain
        }
      });
    }

    // Create new user with Microsoft OAuth data
    user = await prisma.user.create({
      data: {
        email,
        displayName: displayName || email.split('@')[0],
        avatarUrl: null, // Microsoft Graph doesn't provide avatar in basic profile
        passwordHash: '', // OAuth users don't have passwords
        tenantId: tenant ? tenant.id : null
      },
      include: {
        tenant: true
      }
    });

    // Generate token
    const authToken = generateToken(user.id, user.tenantId);

    // Create audit log
    if (user.tenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'USER_CREATED',
          targetId: user.id,
          context: 'Microsoft OAuth registration'
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered and logged in successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          tenantId: user.tenantId,
          tenant: user.tenant,
          createdAt: user.createdAt
        },
        token: authToken
      }
    });

  } catch (error) {
    console.error('Microsoft OAuth error:', error);
    
    // Handle specific Microsoft API errors
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Microsoft access token'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during Microsoft authentication'
    });
  }
};

// GitHub OAuth login
const githubAuth = async (req, res) => {
  try {
    // Check if GitHub OAuth is enabled
    if (!config.oauth.github.enabled) {
      return res.status(400).json({
        success: false,
        message: 'GitHub OAuth is not configured'
      });
    }

    const { accessToken, tenantName, tenantDomain } = req.body;

    // Get user info from GitHub API
    const response = await axios.get(GITHUB_API_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'TeamHub-Platform',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const { email, name, avatar_url, login } = response.data;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Unable to retrieve email from GitHub account. Please make sure your email is public.'
      });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true
      }
    });

    if (user) {
      // User exists, log them in
      const authToken = generateToken(user.id, user.tenantId);

      // Create audit log
      if (user.tenantId) {
        await prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'USER_LOGIN',
            targetId: user.id,
            context: 'GitHub OAuth login'
          }
        });
      }

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            tenantId: user.tenantId,
            tenant: user.tenant,
            createdAt: user.createdAt
          },
          token: authToken
        }
      });
    }

    // User doesn't exist, create new user
    let tenant = null;
    if (tenantName && tenantDomain) {
      // Check if tenant domain already exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { domain: tenantDomain }
      });

      if (existingTenant) {
        return res.status(400).json({
          success: false,
          message: 'Organization domain already exists'
        });
      }

      tenant = await prisma.tenant.create({
        data: {
          name: tenantName,
          domain: tenantDomain
        }
      });
    }

    // Create new user with GitHub OAuth data
    user = await prisma.user.create({
      data: {
        email,
        displayName: name || login,
        avatarUrl: avatar_url,
        passwordHash: '', // OAuth users don't have passwords
        tenantId: tenant ? tenant.id : null
      },
      include: {
        tenant: true
      }
    });

    // Generate token
    const authToken = generateToken(user.id, user.tenantId);

    // Create audit log
    if (user.tenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'USER_CREATED',
          targetId: user.id,
          context: 'GitHub OAuth registration'
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered and logged in successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          tenantId: user.tenantId,
          tenant: user.tenant,
          createdAt: user.createdAt
        },
        token: authToken
      }
    });

  } catch (error) {
    console.error('GitHub OAuth error:', error);
    
    // Handle specific GitHub API errors
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid GitHub access token'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during GitHub authentication'
    });
  }
};

// Discover tenant by domain
const discoverTenant = async (req, res) => {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domain is required'
      });
    }

    // Find tenant by domain
    const tenant = await prisma.tenant.findUnique({
      where: { domain },
      select: {
        id: true,
        name: true,
        domain: true,
        createdAt: true,
        settings: {
          select: {
            allowGuestAccess: true,
            requireInviteApproval: true
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    res.json({
      success: true,
      message: 'Organization found',
      data: {
        tenant
      }
    });

  } catch (error) {
    console.error('Tenant discovery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during tenant discovery'
    });
  }
};

// Login to specific tenant by domain
const loginToTenant = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { domain } = req.params;
    const { email, password } = req.body;

    // Find tenant by domain
    const tenant = await prisma.tenant.findUnique({
      where: { domain },
      include: {
        settings: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Find user by email within this tenant
    const user = await prisma.user.findFirst({
      where: { 
        email,
        tenantId: tenant.id
      },
      include: {
        tenant: {
          include: {
            settings: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or user not found in this organization'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact your administrator.'
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate token
    const token = generateToken(user.id, user.tenantId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'USER_LOGIN',
        targetId: user.id,
        context: `Email login to tenant '${tenant.domain}'`
      }
    });

    // Return user data without password
    const userData = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant,
      lastLoginAt: new Date(),
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('Tenant login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Accept invitation and join tenant
const acceptInvitation = async (req, res) => {
  try {
    const { inviteToken } = req.params;
    const { password, displayName } = req.body;

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { inviteToken },
      include: {
        tenant: {
          include: {
            settings: true
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

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation token'
      });
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Invitation has already been used or revoked'
      });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Invitation has expired'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: invitation.email,
        passwordHash,
        displayName,
        tenantId: invitation.tenantId,
        role: invitation.role,
        permissions: invitation.permissions,
        isActive: true,
        lastLoginAt: new Date()
      },
      include: {
        tenant: {
          include: {
            settings: true
          }
        }
      }
    });

    // Update invitation status
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date()
      }
    });

    // Generate token
    const token = generateToken(user.id, user.tenantId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'USER_JOINED_VIA_INVITATION',
        targetId: user.id,
        context: `User joined tenant '${invitation.tenant.name}' via invitation from ${invitation.invitedBy.displayName}`
      }
    });

    // Return user data
    const userData = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Successfully joined organization',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during invitation acceptance'
    });
  }
};

// Get invitation details
const getInvitationDetails = async (req, res) => {
  try {
    const { inviteToken } = req.params;

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { inviteToken },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        tenant: {
          select: {
            name: true,
            domain: true
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

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation token'
      });
    }

    // Check if invitation is expired
    const isExpired = new Date() > invitation.expiresAt;
    
    res.json({
      success: true,
      message: 'Invitation details retrieved',
      data: {
        invitation: {
          ...invitation,
          isExpired,
          isValid: invitation.status === 'pending' && !isExpired
        }
      }
    });

  } catch (error) {
    console.error('Get invitation details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving invitation details'
    });
  }
};

// Google OAuth login to specific tenant
const googleTenantAuth = async (req, res) => {
  try {
    const { domain } = req.params;
    const { token } = req.body;

    // Check if Google OAuth is enabled
    if (!config.oauth.google.enabled || !googleClient) {
      return res.status(400).json({
        success: false,
        message: 'Google OAuth is not configured'
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Find tenant by domain
    const tenant = await prisma.tenant.findUnique({
      where: { domain },
      include: {
        settings: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: config.oauth.google.clientId
    });

    const payload = ticket.getPayload();
    const { email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Google email is not verified'
      });
    }

    // Find user by email within this tenant
    const user = await prisma.user.findFirst({
      where: { 
        email,
        tenantId: tenant.id
      },
      include: {
        tenant: {
          include: {
            settings: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found in this organization. Please contact your administrator.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact your administrator.'
      });
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate token
    const authToken = generateToken(user.id, user.tenantId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'USER_LOGIN',
        targetId: user.id,
        context: `Google OAuth login to tenant '${tenant.domain}'`
      }
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          tenantId: user.tenantId,
          tenant: user.tenant,
          lastLoginAt: new Date(),
          createdAt: user.createdAt
        },
        token: authToken
      }
    });

  } catch (error) {
    console.error('Google tenant OAuth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google authentication'
    });
  }
};

// Microsoft OAuth login to specific tenant
const microsoftTenantAuth = async (req, res) => {
  try {
    const { domain } = req.params;
    const { accessToken } = req.body;

    // Check if Microsoft OAuth is enabled
    if (!config.oauth.microsoft.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Microsoft OAuth is not configured'
      });
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Microsoft access token is required'
      });
    }

    // Find tenant by domain
    const tenant = await prisma.tenant.findUnique({
      where: { domain },
      include: {
        settings: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Get user info from Microsoft Graph API
    const response = await axios.get(MICROSOFT_GRAPH_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const { mail, displayName, userPrincipalName } = response.data;
    const email = mail || userPrincipalName;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Unable to retrieve email from Microsoft account'
      });
    }

    // Find user by email within this tenant
    const user = await prisma.user.findFirst({
      where: { 
        email,
        tenantId: tenant.id
      },
      include: {
        tenant: {
          include: {
            settings: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found in this organization. Please contact your administrator.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact your administrator.'
      });
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate token
    const authToken = generateToken(user.id, user.tenantId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'USER_LOGIN',
        targetId: user.id,
        context: `Microsoft OAuth login to tenant '${tenant.domain}'`
      }
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          tenantId: user.tenantId,
          tenant: user.tenant,
          lastLoginAt: new Date(),
          createdAt: user.createdAt
        },
        token: authToken
      }
    });

  } catch (error) {
    console.error('Microsoft tenant OAuth error:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Microsoft access token'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during Microsoft authentication'
    });
  }
};

// GitHub OAuth login to specific tenant
const githubTenantAuth = async (req, res) => {
  try {
    const { domain } = req.params;
    const { accessToken } = req.body;

    // Check if GitHub OAuth is enabled
    if (!config.oauth.github.enabled) {
      return res.status(400).json({
        success: false,
        message: 'GitHub OAuth is not configured'
      });
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub access token is required'
      });
    }

    // Find tenant by domain
    const tenant = await prisma.tenant.findUnique({
      where: { domain },
      include: {
        settings: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Get user info from GitHub API
    const response = await axios.get(GITHUB_API_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'TeamHub-Platform',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const { email, name, avatar_url, login } = response.data;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Unable to retrieve email from GitHub account. Please make sure your email is public.'
      });
    }

    // Find user by email within this tenant
    const user = await prisma.user.findFirst({
      where: { 
        email,
        tenantId: tenant.id
      },
      include: {
        tenant: {
          include: {
            settings: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found in this organization. Please contact your administrator.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact your administrator.'
      });
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate token
    const authToken = generateToken(user.id, user.tenantId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'USER_LOGIN',
        targetId: user.id,
        context: `GitHub OAuth login to tenant '${tenant.domain}'`
      }
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          tenantId: user.tenantId,
          tenant: user.tenant,
          lastLoginAt: new Date(),
          createdAt: user.createdAt
        },
        token: authToken
      }
    });

  } catch (error) {
    console.error('GitHub tenant OAuth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during GitHub authentication'
    });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  microsoftAuth,
  githubAuth,
  getCurrentUser,
  logout,
  discoverTenant,
  loginToTenant,
  acceptInvitation,
  getInvitationDetails,
  googleTenantAuth,
  microsoftTenantAuth,
  githubTenantAuth
};
