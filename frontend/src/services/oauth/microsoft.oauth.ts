import { BaseOAuthService } from './base.oauth';
import { msalConfig, oauthConfig, oauthScopes, type OAuthResponse } from '../../config/oauth.config';
import { PublicClientApplication } from '@azure/msal-browser';

export class MicrosoftOAuthService extends BaseOAuthService {
  protected provider = 'microsoft' as const;
  protected clientId = msalConfig.auth.clientId;
  protected authorizeEndpoint = oauthConfig.endpoints.microsoft.authorize;
  protected tokenEndpoint = oauthConfig.endpoints.microsoft.token;
  protected scopes = oauthScopes.microsoft;
  private msalInstance: PublicClientApplication;

  constructor() {
    super();
    this.msalInstance = new PublicClientApplication(msalConfig);
  }

  public async login(): Promise<OAuthResponse> {
    try {
      const loginRequest = {
        scopes: this.scopes,
        prompt: 'select_account',
      };

      const response = await this.msalInstance.loginPopup(loginRequest);
      
      if (!response.accessToken) {
        throw new Error('No access token received');
      }

      return {
        accessToken: response.accessToken,
        idToken: response.idToken,
        expiresIn: response.expiresOn?.getTime() || 0,
        scope: response.scopes.join(' '),
        tokenType: 'Bearer',
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  protected async exchangeCodeForToken(): Promise<OAuthResponse> {
    throw new Error('Method not implemented - Microsoft uses MSAL popup flow');
  }
}
