const base = require('./base');

/**
 * Development environment configuration
 */
module.exports = {
  ...base,
  
  server: {
    ...base.server,
    port: parseInt(process.env.PORT) || 3000, // Change to 3000 to match frontend
    cors: {
      origin: '*', // Allow all origins in development
    },
  },

  logging: {
    ...base.logging,
    level: 'debug',
    format: 'pretty',
  },

  security: {
    ...base.security,
    rateLimiting: {
      enabled: false, // Disable rate limiting in development
    },
  },

  // Override any other environment-specific settings here
};

