const base = require('./base');

/**
 * Development environment configuration
 */
module.exports = {
  ...base,
  
  server: {
    ...base.server,
    port: parseInt(process.env.PORT) || 5000, // Use port 5000 for development
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

