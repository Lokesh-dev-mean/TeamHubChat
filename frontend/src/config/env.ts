/**
 * Environment configuration for the frontend application
 */

// API Configuration
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  withCredentials: true,
};

// OAuth Configuration
export const OAUTH_CONFIG = {
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/auth/google/callback`,
    scopes: ['email', 'profile'],
  },
  microsoft: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: `${window.location.origin}/`,
    scopes: ['user.read', 'openid', 'profile', 'email'],
  },
};

// Application Configuration
export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'TeamHub',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  environment: import.meta.env.MODE,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// Authentication Configuration
export const AUTH_CONFIG = {
  tokenKey: 'auth_token',
  userKey: 'user_data',
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  refreshThreshold: 5 * 60 * 1000, // 5 minutes
};

// Feature Flags
export const FEATURES = {
  enableOAuth: true,
  enableFileUpload: import.meta.env.VITE_ENABLE_FILE_UPLOAD !== 'false',
  maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '52428800', 10), // 50MB
  allowedFileTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

// UI Configuration
export const UI_CONFIG = {
  theme: {
    primaryColor: import.meta.env.VITE_PRIMARY_COLOR || '#1976d2',
    secondaryColor: import.meta.env.VITE_SECONDARY_COLOR || '#dc004e',
    borderRadius: '4px',
  },
  layout: {
    sidebarWidth: 240,
    topbarHeight: 64,
    footerHeight: 48,
  },
  animation: {
    defaultDuration: 300,
    defaultEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Error Messages
export const ERROR_MESSAGES = {
  network: 'Network error. Please check your connection.',
  unauthorized: 'Please log in to continue.',
  forbidden: 'You do not have permission to perform this action.',
  notFound: 'The requested resource was not found.',
  validation: 'Please check your input and try again.',
  server: 'An unexpected error occurred. Please try again later.',
  oauth: {
    google: 'Google authentication failed.',
    microsoft: 'Microsoft authentication failed.',
  },
};

// Validation Rules
export const VALIDATION = {
  password: {
    minLength: 8,
    requireNumber: true,
    requireLetter: true,
    requireSpecial: true,
  },
  username: {
    minLength: 3,
    maxLength: 50,
    allowedChars: /^[a-zA-Z0-9_-]+$/,
  },
  email: {
    maxLength: 255,
    pattern: /^[^@]+@[^@]+\.[^@]+$/,
  },
};

// Export all configurations
export const config = {
  api: API_CONFIG,
  oauth: OAUTH_CONFIG,
  app: APP_CONFIG,
  auth: AUTH_CONFIG,
  features: FEATURES,
  ui: UI_CONFIG,
  errors: ERROR_MESSAGES,
  validation: VALIDATION,
} as const;

export default config;



