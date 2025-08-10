// OAuth Response Types
export interface OAuthResponse {
  accessToken: string;
  idToken?: string;
  expiresIn: number;
  scope: string;
  tokenType: string;
  error?: string;
  errorDescription?: string;
}

// OAuth State Interface
export interface OAuthState {
  value: string;
  timestamp: number;
  provider: 'google' | 'microsoft';
  redirectUri: string;
  tenantDomain?: string;
}

export interface OAuthTenantData {
  tenantName: string;
  tenantDomain: string;
}
