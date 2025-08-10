const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const prisma = require('../utils/prisma');
const { createError } = require('../utils/errors');

/**
 * Middleware to authenticate requests using JWT
 * @returns {Function} Express middleware function
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw createError.authentication('No token, authorization denied');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: true
      }
    });

    if (!user) {
      throw createError.authentication('Token is not valid - user not found');
    }

    if (!user.isActive) {
      throw createError.authorization('Account is deactivated');
    }

    // Add user info to request
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

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(createError.authentication('Token is not valid'));
    } else if (error.name === 'TokenExpiredError') {
      next(createError.authentication('Token has expired'));
    } else {
      next(error);
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
    if (error.name === 'JsonWebTokenError') {
      next(createError.authentication('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(createError.authentication('Token has expired'));
    } else {
      next(error);
    }
  }
};

module.exports = {
  auth,
  validateToken,
};