import React from 'react';
import { Button, Box } from '@mui/material';

interface GoogleOAuthButtonDirectProps {
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  text?: string;
  variant?: 'contained' | 'outlined' | 'text';
  disabled?: boolean;
  tenantName?: string;
}

// Extract GoogleLogo to satisfy Sonar rule
const GoogleLogo: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M9 3.48c1.69 0 2.84.73 3.49 1.34l2.38-2.33C13.66 1.35 11.54 0 9 0 5.48 0 2.44 1.98 .96 4.86l2.89 2.24C4.5 5.01 6.57 3.48 9 3.48z"/>
    <path fill="#4285F4" d="M17.64 9.2c0-.74-.07-1.45-.2-2.13H9v4.03h4.84c-.21 1.14-.84 2.11-1.8 2.76l2.77 2.15c1.62-1.49 2.56-3.69 2.56-6.81z"/>
    <path fill="#FBBC05" d="M3.85 10.7A5.46 5.46 0 0 1 3.56 9c0-.58.1-1.14.28-1.67L.96 5.09A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.89-2.33z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.77-2.15c-.77.52-1.77.83-3.19.83-2.43 0-4.49-1.52-5.23-3.61L.96 13.03C2.44 16.02 5.48 18 9 18z"/>
  </svg>
);

const GoogleOAuthButtonDirect: React.FC<GoogleOAuthButtonDirectProps> = ({
  onSuccess,
  onError,
  text = 'Google',
  variant = 'outlined',
  disabled = false,
  tenantName,
}) => {
  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      onError('Google OAuth client ID is not configured');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'openid email profile';
    const responseType = 'code';
    const state = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    
    // Store state for validation with a timestamp to prevent stale states
    const stateData = {
      value: state,
      timestamp: Date.now()
    };
    sessionStorage.setItem('google_oauth_state', JSON.stringify(stateData));
    
    // Store tenant data if provided
    if (tenantName) {
      sessionStorage.setItem('google_tenant_data', JSON.stringify({
        tenantName: tenantName,
        tenantDomain: tenantName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
      }));
    }
    
    // Build OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('response_type', responseType);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    
    // Redirect to Google OAuth
    window.location.href = authUrl.toString();
  };

  return (
    <Box>
      <Button
        fullWidth
        variant={variant}
        startIcon={<GoogleLogo />}
        onClick={handleGoogleLogin}
        disabled={disabled}
        sx={{
          textTransform: 'none',
          py: 1.1,
          minHeight: 44,
          borderRadius: 1.5,
          backgroundColor: variant === 'contained' ? '#4285F4' : '#fff',
          color: variant === 'contained' ? '#fff' : 'rgb(15,23,42)',
          borderColor: '#E2E8F0',
          borderWidth: 1,
          '&:hover': {
            backgroundColor: variant === 'contained' ? '#3367D6' : '#F8FAFC',
            borderColor: '#CBD5E1',
          },
        }}
      >
        {text}
      </Button>
    </Box>
  );
};

export default GoogleOAuthButtonDirect;
