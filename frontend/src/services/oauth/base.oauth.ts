import { OAuthResponse, OAuthState } from '../../config/oauth.config';

export abstract class BaseOAuthService {
  protected abstract provider: 'google' | 'microsoft';
  protected abstract clientId: string;
  protected abstract authorizeEndpoint: string;
  protected abstract tokenEndpoint: string;
  protected abstract scopes: string[];

  protected validateState(state: string): boolean {
    const storedState = sessionStorage.getItem('oauth_state');
    if (!storedState) return false;

    const stateData = JSON.parse(storedState) as OAuthState & { timestamp: number };
    
    // Check if state is expired (30 minutes)
    const isExpired = Date.now() - stateData.timestamp > 30 * 60 * 1000;
    if (isExpired) {
      sessionStorage.removeItem('oauth_state');
      return false;
    }

    return stateData.value === state && stateData.provider === this.provider;
  }

  protected clearState(): void {
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('tenant_data');
  }

  protected handleError(error: any): never {
    const errorMessage = error.message || 'Authentication failed';
    throw new Error(`${this.provider} OAuth error: ${errorMessage}`);
  }

  protected abstract exchangeCodeForToken(code: string): Promise<OAuthResponse>;
}
