const fs = require('fs');
const path = require('path');
const config = require('../config/environment');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.logLevel = LOG_LEVELS[config.logging?.level?.toUpperCase()] || LOG_LEVELS.INFO;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };
    return JSON.stringify(logEntry);
  }

  writeToFile(filename, message) {
    const logFile = path.join(logsDir, filename);
    const logMessage = message + '\n';
    
    fs.appendFileSync(logFile, logMessage, 'utf8');
  }

  error(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', message, meta);
      console.error(`❌ ERROR: ${message}`, meta);
      this.writeToFile('error.log', formattedMessage);
      this.writeToFile('combined.log', formattedMessage);
    }
  }

  warn(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      const formattedMessage = this.formatMessage('WARN', message, meta);
      console.warn(`⚠️  WARN: ${message}`, meta);
      this.writeToFile('combined.log', formattedMessage);
    }
  }

  info(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      const formattedMessage = this.formatMessage('INFO', message, meta);
      console.log(`ℹ️  INFO: ${message}`, meta);
      this.writeToFile('combined.log', formattedMessage);
    }
  }

  debug(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      const formattedMessage = this.formatMessage('DEBUG', message, meta);
      console.log(`🐛 DEBUG: ${message}`, meta);
      this.writeToFile('debug.log', formattedMessage);
      this.writeToFile('combined.log', formattedMessage);
    }
  }

  // API specific logging
  apiError(req, error, statusCode = 500) {
    const meta = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      statusCode,
      stack: error.stack,
      body: req.method !== 'GET' ? req.body : undefined,
      query: req.query
    };

    this.error(`API Error: ${error.message}`, meta);
  }

  apiRequest(req, res, responseTime) {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      tenantId: req.user?.tenantId
    };

    if (res.statusCode >= 400) {
      this.warn(`API Request Failed: ${req.method} ${req.url}`, meta);
    } else {
      this.info(`API Request: ${req.method} ${req.url}`, meta);
    }
  }
}

const logger = new Logger();

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    logger.apiRequest(req, res, responseTime);
    originalEnd.apply(this, args);
  };

  next();
};

// Error logging middleware
const errorLogger = (error, req, res, next) => {
  // Log the error
  logger.apiError(req, error, res.statusCode || 500);

  // Continue to error handler
  next(error);
};

// Global error handler
const errorHandler = (error, req, res, next) => {
  // Default error response
  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || 'Internal Server Error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not Found';
  } else if (error.code === 'P2002') { // Prisma unique constraint
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (error.code === 'P2025') { // Prisma record not found
    statusCode = 404;
    message = 'Record not found';
  }

  // Send error response (include top-level message for client UX)
  res.status(statusCode).json({
    success: false,
    message, // top-level message for clients consuming error.message
    error: {
      message,
      statusCode,
      code: error.errorCode || error.code,
      ...(config.app.env === 'development' && {
        stack: error.stack,
        details: error,
      }),
    },
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  });
};

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason.toString(),
    stack: reason.stack,
    promise: promise.toString()
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack
  });
  
  // Gracefully close server
  process.exit(1);
});

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  errorHandler
};
