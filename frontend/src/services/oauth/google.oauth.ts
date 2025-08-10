import { BaseOAuthService } from './base.oauth';
import { googleConfig, oauthConfig, type OAuthResponse } from '../../config/oauth.config';
import axios from 'axios';

export class GoogleOAuthService extends BaseOAuthService {
  protected provider = 'google' as const;
  protected clientId = googleConfig.clientId;
  protected authorizeEndpoint = oauthConfig.endpoints.google.authorize;
  protected tokenEndpoint = oauthConfig.endpoints.google.token;
  protected scopes = googleConfig.scopes;

  public async handleCallback(code: string, state: string): Promise<OAuthResponse> {
    try {
      if (!this.validateState(state)) {
        throw new Error('Invalid OAuth state');
      }

      const response = await this.exchangeCodeForToken(code);
      this.clearState();
      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  protected async exchangeCodeForToken(code: string): Promise<OAuthResponse> {
    try {
      const response = await axios.post(this.tokenEndpoint, { code });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to exchange code for token: ${error.message || 'Unknown error'}`);
    }
  }
}
