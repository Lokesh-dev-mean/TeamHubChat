const base = require('./base');

/**
 * Production environment configuration
 */
module.exports = {
  ...base,
  
  app: {
    ...base.app,
    env: 'production',
    debug: false,
  },

  server: {
    ...base.server,
    cors: {
      ...base.security.cors,
      // Only allow configured origins in production
      origin: (origin, callback) => {
        if (!origin || base.server.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
    },
  },

  logging: {
    ...base.logging,
    level: 'info',
    format: 'json',
  },

  security: {
    ...base.security,
    rateLimiting: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      xssFilter: true,
      noSniff: true,
      hidePoweredBy: true,
      frameguard: {
        action: 'deny',
      },
    },
  },

  // Production-specific overrides
  database: {
    ...base.database,
    poolMin: 5,
    poolMax: 20,
  },

  storage: {
    ...base.storage,
    provider: 's3', // Use S3 in production
  },
};

