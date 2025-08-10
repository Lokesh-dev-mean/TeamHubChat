const { AppError } = require('../utils/errors');
const config = require('../config/environment');

// Log error details
const logError = (err) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    errorCode: err.errorCode,
    isOperational: err.isOperational,
  });
};

// Format error response
const formatError = (err) => {
  const response = {
    success: false,
    message: err.message,
  };

  // Add error code in development or if it's an operational error
  if (config.app.isDevelopment || err.isOperational) {
    response.errorCode = err.errorCode;
  }

  // Add stack trace in development
  if (config.app.isDevelopment) {
    response.stack = err.stack;
  }

  return response;
};

// Handle validation errors from express-validator
const handleValidationError = (errors) => {
  const formattedErrors = errors.array().map(error => ({
    field: error.param,
    message: error.msg,
  }));

  return {
    success: false,
    message: 'Validation failed',
    errors: formattedErrors,
  };
};

// Handle Prisma errors
const handlePrismaError = (err) => {
  if (err.code === 'P2002') {
    return new AppError('Duplicate field value entered', 409, 'DUPLICATE_ERROR');
  }
  if (err.code === 'P2025') {
    return new AppError('Record not found', 404, 'NOT_FOUND_ERROR');
  }
  return err;
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log all errors
  logError(err);

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    err = handlePrismaError(err);
  }

  // Handle express-validator errors
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json(handleValidationError(err));
  }

  // Set default status code if not set
  err.statusCode = err.statusCode || 500;

  // Send error response
  res.status(err.statusCode).json(formatError(err));
};

// Catch unhandled rejections and exceptions
const setupErrorHandling = (app) => {
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
    // Log error and exit gracefully
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    // Log error and exit gracefully
    process.exit(1);
  });

  // Add error handling middleware
  app.use(errorHandler);
};

module.exports = {
  errorHandler,
  setupErrorHandling,
};
