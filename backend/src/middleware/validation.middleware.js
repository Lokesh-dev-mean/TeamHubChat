const { validationResult } = require('express-validator');
const { createError } = require('../utils/errors');

/**
 * Middleware to validate request using express-validator
 * @returns {Function} Express middleware function
 */
const validateRequest = () => {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
    }));

    next(createError.validation('Validation failed', formattedErrors));
  };
};

module.exports = {
  validateRequest,
};
