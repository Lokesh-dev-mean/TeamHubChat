const { validationResult } = require('express-validator');
const authService = require('../services/auth.service');

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
      await authService.logout(req.user.id);
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Server error during logout'
      });
    }
  }

  async getCurrentUser(req, res) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      res.json({
        success: true,
        data: { user }
      });
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
      const status = error.message.includes('Invalid') ? 404 : 500;
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