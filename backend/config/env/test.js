const base = require('./base');

/**
 * Test environment configuration
 */
module.exports = {
  ...base,
  
  app: {
    ...base.app,
    env: 'test',
    debug: true,
  },

  server: {
    ...base.server,
    port: parseInt(process.env.TEST_PORT) || 5001,
  },

  database: {
    ...base.database,
    url: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/teamhub_test',
    poolMin: 1,
    poolMax: 5,
  },

  logging: {
    ...base.logging,
    level: 'error',
    format: 'pretty',
    silent: process.env.TEST_LOGGING !== 'true',
  },

  security: {
    ...base.security,
    rateLimiting: {
      enabled: false,
    },
  },

  // Test-specific settings
  test: {
    coverage: {
      enabled: true,
      directory: 'coverage',
    },
    timeout: 5000,
    mockServices: true,
  },
};

