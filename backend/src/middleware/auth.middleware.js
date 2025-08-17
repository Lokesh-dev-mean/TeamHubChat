const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const { prisma } = require('../utils/prisma');
const { createError } = require('../utils/errors');

/**
 * Middleware to authenticate requests using JWT
 * @returns {Function} Express middleware function
 */
const auth = async (req, res, next) => {
  try {
    console.log('🔍 Auth Middleware - Start');
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('🔑 Token:', token ? 'Present' : 'Missing');

    if (!token) {
      throw createError.authentication('No token, authorization denied');
    }

    // Verify token
    console.log('🔐 Verifying token...');
    const decoded = jwt.verify(token, config.jwt.secret);
    console.log('✅ Token verified, decoded:', { userId: decoded.userId, tenantId: decoded.tenantId });
    
    // Get user from database
    console.log('🔍 Finding user in database...');
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: true
      }
    });

    if (!user) {
      console.log('❌ User not found in database');
      throw createError.authentication('Token is not valid - user not found');
    }
    console.log('✅ User found:', { id: user.id, email: user.email });

    if (!user.isActive) {
      console.log('❌ User account is deactivated');
      throw createError.authorization('Account is deactivated');
    }
    console.log('✅ User account is active');

    // Add user info to request
    console.log('📝 Setting request properties...');
    req.userId = user.id;
    req.tenantId = user.tenantId;
    req.user = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant
    };
    console.log('✅ Request properties set:', {
      userId: req.userId,
      tenantId: req.tenantId,
      user: {
        id: req.user.id,
        email: req.user.email
      }
    });

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    } else {
      return res.status(401).json({
        success: false,
        message: error.message || 'Authentication failed'
      });
    }
  }
};

/**
 * Middleware to validate JWT token
 * @returns {Function} Express middleware function
 */
const validateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw createError.authentication('No token provided');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    res.locals.tokenData = decoded;
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    } else {
      return res.status(401).json({
        success: false,
        message: error.message || 'Token validation failed'
      });
    }
  }
};

module.exports = {
  auth,
  validateToken,
};