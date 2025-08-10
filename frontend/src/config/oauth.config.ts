
// Microsoft OAuth Configuration
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: `${window.location.origin}/`,
    postLogoutRedirectUri: `${window.location.origin}/`,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    allowNativeBroker: false,
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    loggerOptions: {
      loggerCallback: (level: number, message: string, containsPii: boolean) => {
        if (containsPii) {
          return;
        }
        // Only log errors to reduce noise
        if (level <= 1) {
          console.error(`[MSAL] ${message}`);
        }
      },
      piiLoggingEnabled: false,
      logLevel: 1, // Only errors
    },
  },
};

// Google OAuth Configuration
export const googleConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  scopes: ['email', 'profile', 'openid'],
  redirectUri: `${window.location.origin}/auth/google/callback`,
};

// Common OAuth Configuration
export const oauthConfig = {
  // Common settings for all providers
  responseType: 'code',
  grantType: 'authorization_code',
  
  // Provider-specific endpoints
  endpoints: {
    google: {
      authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: '/api/auth/google/exchange',
    },
    microsoft: {
      authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      token: '/api/auth/microsoft/exchange',
    },
  },
};

// OAuth Scopes
export const oauthScopes = {
  google: ['email', 'profile', 'openid'],
  microsoft: ['user.read', 'openid', 'profile', 'email'],
};
