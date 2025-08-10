import React from 'react';
import { Button, Box } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { googleConfig, oauthConfig } from '../../config/oauth.config';
import { ButtonVariant } from '../../types/common';
import { OAuthState, OAuthTenantData } from '../../types/auth';

interface GoogleOAuthButtonProps {
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  text?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  tenantName?: string;
}

const GoogleOAuthButton: React.FC<GoogleOAuthButtonProps> = ({
  onSuccess,
  onError,
  text = 'Continue with Google',
  variant = 'outlined',
  disabled = false,
  tenantName,
}) => {
  const handleGoogleLogin = () => {
    if (!googleConfig.clientId) {
      onError('Google OAuth client ID is not configured');
      return;
    }

    // Clear any existing OAuth data
    sessionStorage.removeItem('google_oauth_state');
    sessionStorage.removeItem('google_tenant_data');

    // Generate state using crypto API
    const stateBuffer = new Uint8Array(16);
    window.crypto.getRandomValues(stateBuffer);
    const state = Array.from(stateBuffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Store state with additional metadata
    const stateData: OAuthState = {
      value: state,
      timestamp: Date.now(),
      provider: 'google',
      redirectUri: googleConfig.redirectUri
    };
    
    // Store state in session storage
    sessionStorage.setItem('google_oauth_state', JSON.stringify(stateData));
    
    // Store tenant data if provided
    if (tenantName) {
      const tenantData: OAuthTenantData = {
        tenantName: tenantName,
        tenantDomain: tenantName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
      };
      sessionStorage.setItem('google_tenant_data', JSON.stringify(tenantData));
    }
    
    // Build OAuth URL
    const authUrl = new URL(oauthConfig.endpoints.google.authorize);
    authUrl.searchParams.append('client_id', googleConfig.clientId);
    authUrl.searchParams.append('redirect_uri', googleConfig.redirectUri);
    authUrl.searchParams.append('scope', googleConfig.scopes.join(' '));
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    
    // Log for debugging
    console.log('Starting OAuth flow with:', {
      redirectUri: googleConfig.redirectUri,
      state,
      storedState: sessionStorage.getItem('google_oauth_state')
    });

    // Redirect to Google OAuth
    window.location.href = authUrl.toString();
  };

  return (
    <Box>
      <Button
        fullWidth
        variant={variant}
        startIcon={<GoogleIcon />}
        onClick={handleGoogleLogin}
        disabled={disabled}
        sx={{
          textTransform: 'none',
          py: 1.5,
          borderColor: variant === 'outlined' ? '#dadce0' : undefined,
          color: variant === 'outlined' ? '#3c4043' : undefined,
          '&:hover': {
            backgroundColor: variant === 'outlined' ? '#f8f9fa' : undefined,
            borderColor: variant === 'outlined' ? '#dadce0' : undefined,
          },
        }}
      >
        {text}
      </Button>
    </Box>
  );
};

export default GoogleOAuthButton;
