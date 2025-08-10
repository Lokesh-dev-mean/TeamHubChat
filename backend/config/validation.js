const { createError } = require('../utils/errors');

/**
 * Environment variable validation schema
 */
const ENV_SCHEMA = {
  // Required variables
  required: {
    DATABASE_URL: {
      type: 'string',
      pattern: /^postgresql:\/\/.+/,
      message: 'Must be a valid PostgreSQL connection URL',
    },
    JWT_SECRET: {
      type: 'string',
      minLength: 32,
      message: 'Must be at least 32 characters long',
    },
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production', 'test'],
      message: 'Must be one of: development, production, test',
    },
  },

  // Optional variables with defaults
  optional: {
    PORT: {
      type: 'number',
      min: 1,
      max: 65535,
      default: 5000,
      message: 'Must be a valid port number (1-65535)',
    },
    LOG_LEVEL: {
      type: 'string',
      enum: ['error', 'warn', 'info', 'debug'],
      default: 'info',
      message: 'Must be one of: error, warn, info, debug',
    },
    CORS_ORIGINS: {
      type: 'array',
      delimiter: ',',
      default: ['http://localhost:3000'],
      message: 'Must be a comma-separated list of URLs',
    },
    JWT_EXPIRES_IN: {
      type: 'string',
      pattern: /^\d+[hdwmy]$/,
      default: '24h',
      message: 'Must be a duration string (e.g., 24h, 7d, 1w)',
    },
  },

  // Conditional variables (required only in certain environments)
  conditional: {
    production: {
      AWS_S3_BUCKET: {
        type: 'string',
        message: 'Required in production for file storage',
      },
      AWS_REGION: {
        type: 'string',
        pattern: /^[a-z]{2}-[a-z]+-\d{1,2}$/,
        message: 'Must be a valid AWS region',
      },
    },
  },
};

/**
 * Validate environment variables
 * @param {Object} env - Environment variables object
 * @param {string} currentEnv - Current environment (development, production, test)
 * @returns {Object} Validated and processed environment variables
 * @throws {Error} If validation fails
 */
function validateEnv(env, currentEnv = env.NODE_ENV || 'development') {
  const errors = [];
  const validatedEnv = {};

  // Validate required variables
  Object.entries(ENV_SCHEMA.required).forEach(([key, schema]) => {
    const value = env[key];
    if (!value) {
      errors.push(`${key} is required`);
      return;
    }

    if (!validateValue(value, schema)) {
      errors.push(`${key}: ${schema.message}`);
      return;
    }

    validatedEnv[key] = processValue(value, schema);
  });

  // Process optional variables
  Object.entries(ENV_SCHEMA.optional).forEach(([key, schema]) => {
    const value = env[key] || schema.default;
    if (value && !validateValue(value, schema)) {
      errors.push(`${key}: ${schema.message}`);
      return;
    }

    validatedEnv[key] = processValue(value, schema);
  });

  // Validate conditional variables
  if (ENV_SCHEMA.conditional[currentEnv]) {
    Object.entries(ENV_SCHEMA.conditional[currentEnv]).forEach(([key, schema]) => {
      const value = env[key];
      if (!value) {
        errors.push(`${key} is required in ${currentEnv} environment`);
        return;
      }

      if (!validateValue(value, schema)) {
        errors.push(`${key}: ${schema.message}`);
        return;
      }

      validatedEnv[key] = processValue(value, schema);
    });
  }

  if (errors.length > 0) {
    throw createError.validation('Environment validation failed', errors);
  }

  return validatedEnv;
}

/**
 * Validate a single value against its schema
 * @param {any} value - Value to validate
 * @param {Object} schema - Validation schema
 * @returns {boolean} Whether the value is valid
 */
const validators = {
  string: (value, schema) => {
    if (schema.pattern && !schema.pattern.test(value)) {
      return false;
    }
    if (schema.minLength && value.length < schema.minLength) {
      return false;
    }
    if (schema.enum && !schema.enum.includes(value)) {
      return false;
    }
    return true;
  },

  number: (value, schema) => {
    const num = Number(value);
    if (isNaN(num)) {
      return false;
    }
    if (schema.min !== undefined && num < schema.min) {
      return false;
    }
    if (schema.max !== undefined && num > schema.max) {
      return false;
    }
    return true;
  },

  array: (value, schema) => {
    if (typeof value === 'string') {
      const array = value.split(schema.delimiter || ',').map(v => v.trim());
      return array.length > 0;
    }
    return Array.isArray(value);
  },
};

function validateValue(value, schema) {
  const validator = validators[schema.type];
  return validator ? validator(value, schema) : true;
}

/**
 * Process a value according to its schema
 * @param {any} value - Value to process
 * @param {Object} schema - Processing schema
 * @returns {any} Processed value
 */
function processValue(value, schema) {
  switch (schema.type) {
    case 'number':
      return Number(value);

    case 'array':
      if (typeof value === 'string') {
        return value.split(schema.delimiter || ',').map(v => v.trim());
      }
      return value;

    default:
      return value;
  }
}

module.exports = {
  validateEnv,
  ENV_SCHEMA,
};
