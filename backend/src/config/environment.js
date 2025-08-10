const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

/**
 * Environment Configuration
 * Centralizes all environment variable handling with defaults and validation
 */
class EnvironmentConfig {
  constructor() {
    this.validateRequiredEnvVars();
  }

  // ===========================================
  // APPLICATION SETTINGS
  // ===========================================
  get app() {
    return {
      name: process.env.APP_NAME || 'TeamHub Communication Platform',
      version: process.env.APP_VERSION || '1.0.0',
      env: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT) || 5000,
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',
      isTest: process.env.NODE_ENV === 'test'
    };
  }

  // ===========================================
  // FRONTEND CONFIGURATION
  // ===========================================
  get frontend() {
    return {
      url: process.env.FRONTEND_URL || 'http://localhost:5173',
      domain: process.env.FRONTEND_DOMAIN || 'localhost:5173'
    };
  }

  // ===========================================
  // DATABASE CONFIGURATION
  // ===========================================
  get database() {
    return {
      url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/teamhub',
      testUrl: process.env.TEST_DATABASE_URL || 'postgresql://username:password@localhost:5432/teamhub_test',
      pool: {
        min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
        max: parseInt(process.env.DATABASE_POOL_MAX) || 10,
        timeout: parseInt(process.env.DATABASE_TIMEOUT) || 30000
      }
    };
  }

  // ===========================================
  // JWT & AUTHENTICATION
  // ===========================================
  get jwt() {
    return {
      secret: process.env.JWT_SECRET || 'your-fallback-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    };
  }

  get auth() {
    return {
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
      sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
      sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000
    };
  }

  // ===========================================
  // OAUTH PROVIDERS
  // ===========================================
  get oauth() {
    return {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_REDIRECT_URI || `${this.frontend.url}/auth/google/callback`,
        enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      },
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
        enabled: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
      }
    };
  }

  // ===========================================
  // FILE STORAGE CONFIGURATION
  // ===========================================
  get storage() {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES 
      ? process.env.ALLOWED_FILE_TYPES.split(',').map(type => type.trim())
      : [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
          'application/pdf', 'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain', 'text/csv', 'application/zip'
        ];

    return {
      type: process.env.STORAGE_TYPE || 'local',
      uploadDir: process.env.UPLOAD_DIR || 'uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB
      maxFilesPerRequest: parseInt(process.env.MAX_FILES_PER_REQUEST) || 10,
      allowedFileTypes: allowedTypes,
      useS3: process.env.USE_S3 === 'true',
      aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        s3Bucket: process.env.AWS_S3_BUCKET
      }
    };
  }

  // ===========================================
  // CORS CONFIGURATION
  // ===========================================
  get cors() {
    const originsRaw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
    const origins = originsRaw
      ? originsRaw.split(',').map(origin => origin.trim())
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:3000',
          'http://127.0.0.1:3000'
        ];

    return {
      origin: origins,
      credentials: process.env.CORS_CREDENTIALS !== 'false',
      maxAge: parseInt(process.env.CORS_MAX_AGE) || 86400
    };
  }

  // ===========================================
  // RATE LIMITING
  // ===========================================
  get rateLimit() {
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again later',
      auth: {
        windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000,
        maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5
      }
    };
  }

  // ===========================================
  // WEBSOCKET CONFIGURATION
  // ===========================================
  get websocket() {
    const corsOriginsRaw = process.env.WEBSOCKET_CORS_ORIGINS || process.env.WEBSOCKET_CORS_ORIGIN;
    const corsOrigins = corsOriginsRaw
      ? corsOriginsRaw.split(',').map(origin => origin.trim())
      : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'];

    return {
      corsOrigin: corsOrigins,
      pingTimeout: parseInt(process.env.WEBSOCKET_PING_TIMEOUT) || 60000,
      pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL) || 25000
    };
  }

  // ===========================================
  // EMAIL CONFIGURATION
  // ===========================================
  get email() {
    return {
      service: process.env.EMAIL_SERVICE || 'smtp',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      from: {
        name: process.env.EMAIL_FROM_NAME || 'TeamHub Platform',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@teamhub.com'
      },
      enabled: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD)
    };
  }

  // ===========================================
  // LOGGING CONFIGURATION
  // ===========================================
  get logging() {
    return {
      level: process.env.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE || 'logs/app.log',
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
      httpRequests: process.env.LOG_HTTP_REQUESTS !== 'false',
      databaseQueries: process.env.LOG_DATABASE_QUERIES === 'true',
      websocketEvents: process.env.LOG_WEBSOCKET_EVENTS !== 'false'
    };
  }

  // ===========================================
  // SECURITY SETTINGS
  // ===========================================
  get security() {
    return {
      forceHttps: process.env.FORCE_HTTPS === 'true',
      trustProxy: process.env.TRUST_PROXY === 'true',
      csp: {
        enabled: process.env.CSP_ENABLED !== 'false',
        reportOnly: process.env.CSP_REPORT_ONLY === 'true'
      },
      helmet: {
        enabled: process.env.HELMET_ENABLED !== 'false'
      }
    };
  }

  // ===========================================
  // CACHE CONFIGURATION
  // ===========================================
  get cache() {
    return {
      redis: {
        enabled: process.env.REDIS_ENABLED === 'true',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0
      },
      ttl: {
        short: parseInt(process.env.CACHE_TTL_SHORT) || 300,
        medium: parseInt(process.env.CACHE_TTL_MEDIUM) || 3600,
        long: parseInt(process.env.CACHE_TTL_LONG) || 86400
      }
    };
  }

  // ===========================================
  // MONITORING & ANALYTICS
  // ===========================================
  get monitoring() {
    return {
      enabled: process.env.MONITORING_ENABLED !== 'false',
      analytics: process.env.ANALYTICS_ENABLED !== 'false',
      healthCheck: {
        enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
        path: process.env.HEALTH_CHECK_PATH || '/health'
      },
      metrics: {
        enabled: process.env.METRICS_ENABLED === 'true',
        port: parseInt(process.env.METRICS_PORT) || 9090
      }
    };
  }

  // ===========================================
  // TENANT SETTINGS
  // ===========================================
  get tenant() {
    return {
      defaults: {
        maxUsersPerTenant: parseInt(process.env.DEFAULT_MAX_USERS_PER_TENANT) || 1000,
        maxStoragePerTenant: parseInt(process.env.DEFAULT_MAX_STORAGE_PER_TENANT) || 5368709120, // 5GB
        messageRetentionDays: parseInt(process.env.DEFAULT_MESSAGE_RETENTION_DAYS) || 365,
        allowGuestAccess: process.env.DEFAULT_ALLOW_GUEST_ACCESS === 'true',
        requireInviteApproval: process.env.DEFAULT_REQUIRE_INVITE_APPROVAL !== 'false'
      }
    };
  }

  // ===========================================
  // INVITATION SETTINGS
  // ===========================================
  get invitation() {
    return {
      expiresInDays: parseInt(process.env.INVITATION_EXPIRES_IN_DAYS) || 7,
      tokenLength: parseInt(process.env.INVITATION_TOKEN_LENGTH) || 32,
      maxPendingPerTenant: parseInt(process.env.MAX_PENDING_INVITATIONS_PER_TENANT) || 100
    };
  }

  // ===========================================
  // SEARCH CONFIGURATION
  // ===========================================
  get search() {
    return {
      resultsPerPage: parseInt(process.env.SEARCH_RESULTS_PER_PAGE) || 20,
      maxResults: parseInt(process.env.SEARCH_MAX_RESULTS) || 1000,
      minQueryLength: parseInt(process.env.SEARCH_MIN_QUERY_LENGTH) || 2
    };
  }

  // ===========================================
  // PAGINATION DEFAULTS
  // ===========================================
  get pagination() {
    return {
      defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE) || 20,
      maxPageSize: parseInt(process.env.MAX_PAGE_SIZE) || 100
    };
  }

  // ===========================================
  // API DOCUMENTATION
  // ===========================================
  get swagger() {
    return {
      enabled: process.env.SWAGGER_ENABLED !== 'false',
      path: process.env.SWAGGER_PATH || '/api-docs',
      title: process.env.SWAGGER_TITLE || 'TeamHub Communication Platform API',
      description: process.env.SWAGGER_DESCRIPTION || 'Comprehensive API documentation for TeamHub Platform',
      version: process.env.SWAGGER_VERSION || '1.0.0'
    };
  }

  // ===========================================
  // FEATURE FLAGS
  // ===========================================
  get features() {
    return {
      crossTenantMessaging: process.env.FEATURE_CROSS_TENANT_MESSAGING !== 'false',
      fileSharing: process.env.FEATURE_FILE_SHARING !== 'false',
      messageReactions: process.env.FEATURE_MESSAGE_REACTIONS !== 'false',
      typingIndicators: process.env.FEATURE_TYPING_INDICATORS !== 'false',
      userPresence: process.env.FEATURE_USER_PRESENCE !== 'false',
      auditLogging: process.env.FEATURE_AUDIT_LOGGING !== 'false',
      advancedSearch: process.env.FEATURE_ADVANCED_SEARCH !== 'false',
      adminDashboard: process.env.FEATURE_ADMIN_DASHBOARD !== 'false',
      oauthLogin: process.env.FEATURE_OAUTH_LOGIN !== 'false',
      emailNotifications: process.env.FEATURE_EMAIL_NOTIFICATIONS === 'true',
      pushNotifications: process.env.FEATURE_PUSH_NOTIFICATIONS === 'true'
    };
  }

  // ===========================================
  // THIRD-PARTY INTEGRATIONS
  // ===========================================
  get integrations() {
    return {
      webhook: {
        secret: process.env.WEBHOOK_SECRET,
        timeout: parseInt(process.env.WEBHOOK_TIMEOUT) || 5000
      },
      analytics: {
        googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
        mixpanelToken: process.env.MIXPANEL_TOKEN
      },
      errorTracking: {
        sentryDsn: process.env.SENTRY_DSN,
        sentryEnvironment: process.env.SENTRY_ENVIRONMENT || 'development'
      }
    };
  }

  // ===========================================
  // VALIDATION
  // ===========================================
  validateRequiredEnvVars() {
    const required = [
      'DATABASE_URL',
      'JWT_SECRET'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('Missing required environment variables:', missing.join(', '));
      console.error('Please check your .env file and ensure all required variables are set.');
      
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }

    // Warn about missing OAuth configurations
    const oauthProviders = ['GOOGLE', 'MICROSOFT', 'GITHUB'];
    const missingOAuth = oauthProviders.filter(provider => 
      !process.env[`${provider}_CLIENT_ID`] || !process.env[`${provider}_CLIENT_SECRET`]
    );

    if (missingOAuth.length > 0) {
      console.warn(`OAuth providers not configured: ${missingOAuth.join(', ')}`);
      console.warn('OAuth login will be disabled for these providers.');
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================
  isDevelopment() {
    return this.app.isDevelopment;
  }

  isProduction() {
    return this.app.isProduction;
  }

  isTest() {
    return this.app.isTest;
  }

  getUploadPath() {
    return path.resolve(process.cwd(), this.storage.uploadDir);
  }

  getLogPath() {
    return path.resolve(process.cwd(), this.logging.file);
  }
}

// Create and export singleton instance
const config = new EnvironmentConfig();

module.exports = config;
