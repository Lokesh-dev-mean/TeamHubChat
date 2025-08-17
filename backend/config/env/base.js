/**
 * Base configuration shared across all environments
 */
module.exports = {
  app: {
    name: 'TeamHub Communication Platform',
    version: '1.0.0',
  },

  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT) || 5000,
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://127.0.0.1:5173'],
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  database: {
    url: process.env.DATABASE_URL,
    poolMin: 2,
    poolMax: 10,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    directory: process.env.LOG_DIR || 'logs',
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    local: {
      directory: process.env.STORAGE_LOCAL_DIR || 'uploads',
    },
    s3: {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION,
    },
  },

  oauth: {
    google: {
      enabled: !!process.env.GOOGLE_CLIENT_ID,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    microsoft: {
      enabled: !!process.env.MICROSOFT_CLIENT_ID,
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackUrl: process.env.MICROSOFT_CALLBACK_URL,
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    },
  },

  tenant: {
    defaultSettings: {
      allowGuestAccess: false,
      requireInviteApproval: true,
      maxFileSize: 52428800, // 50MB
      allowedFileTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
    },
  },

  security: {
    bcryptRounds: 12,
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
    cors: {
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  },
};



