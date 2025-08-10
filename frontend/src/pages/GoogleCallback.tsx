import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { OAuthState, OAuthTenantData } from '../types/auth';

// Extract state validation to reduce cognitive complexity
function validateAndParseState(stateParam: string | null, storedStateJson: string | null) {
  if (!stateParam || !storedStateJson) {
    throw new Error('Missing state parameter');
  }
  let parsed: OAuthState;
  try {
    parsed = JSON.parse(storedStateJson) as OAuthState;
  } catch {
    throw new Error('Invalid state format - please try again');
  }
  const isExpired = Date.now() - parsed.timestamp > 30 * 60 * 1000;
  if (isExpired) throw new Error('State parameter expired - please try again');
  if (stateParam !== parsed.value) throw new Error('Invalid state parameter - possible CSRF attack');
  if (parsed.provider && parsed.provider !== 'google') throw new Error('Invalid OAuth provider');
  if (parsed.redirectUri && parsed.redirectUri !== window.location.origin + '/auth/google/callback') {
    throw new Error('Invalid redirect URI');
  }
}

const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { googleAuth } = useAuth();
  const toast = useToast();
  useEffect(() => {
    const processedRef = (GoogleCallback as any)._processedRef || { current: false };
    (GoogleCallback as any)._processedRef = processedRef;
    const processCallback = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const storedStateJson = sessionStorage.getItem('google_oauth_state');
        const error = searchParams.get('error');
        
        // Handle OAuth errors
        if (error) {
          throw new Error(`Google OAuth error: ${error}`);
        }

        // Validate required parameters
        if (!code) {
          throw new Error('Authorization code not received from Google');
        }

        if (!state || !storedStateJson) {
          throw new Error('Missing state parameter');
        }

        try {
          console.log('Retrieved stored state JSON:', storedStateJson);
          const storedState = JSON.parse(storedStateJson) as OAuthState;
          console.log('Parsed stored state:', storedState);

          const isExpired = Date.now() - storedState.timestamp > 30 * 60 * 1000;
          if (isExpired) {
            throw new Error('State parameter expired - please try again');
          }

          if (state !== storedState.value) {
            throw new Error('Invalid state parameter - possible CSRF attack');
          }

          if (storedState.provider && storedState.provider !== 'google') {
            throw new Error('Invalid OAuth provider');
          }

          if (
            storedState.redirectUri &&
            storedState.redirectUri !== window.location.origin + '/auth/google/callback'
          ) {
            throw new Error('Invalid redirect URI');
          }
        } catch (e: unknown) {
          if (e instanceof Error) {
            throw e;
          }
          throw new Error('Invalid state format - please try again');
        }

        // Get tenant data if available
        const tenantData = sessionStorage.getItem('google_tenant_data');
        let tenantName, tenantDomain;
        
        if (tenantData) {
          const parsed = JSON.parse(tenantData) as OAuthTenantData;
          tenantName = parsed.tenantName;
          tenantDomain = parsed.tenantDomain;
          sessionStorage.removeItem('google_tenant_data');
        }

        // Exchange code for tokens and authenticate
        try {
          await googleAuth(code, tenantName, tenantDomain);
          navigate('/dashboard');
        } catch (e: any) {
          const msg = (e?.message || '').toLowerCase();
          const pendingToken = sessionStorage.getItem('pending_google_id_token');
          const needsRegistration = msg.includes('register first') || msg.includes('organization details required');
          if ((needsRegistration || pendingToken) && (!tenantName || !tenantDomain)) {
            toast.info('No account found. Please register your organization to continue.');
            sessionStorage.setItem('oauth_register_reason', 'no_account');
            navigate('/register');
            return;
          }
          throw e;
        }

      } catch (error: any) {
        console.error('Google OAuth callback error:', error);
        toast.error(error.message || 'Google authentication failed');
        
        // Redirect to login page after error
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } finally {
        // Clean up stored state after processing (success or failure)
        sessionStorage.removeItem('google_oauth_state');
        sessionStorage.removeItem('google_tenant_data');
      }
    };

    processCallback();
  }, [searchParams, navigate, googleAuth]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
    >
      <CircularProgress size={40} sx={{ mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Completing Google Authentication
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Please wait while we process your login...
      </Typography>
    </Box>
  );
};

export default GoogleCallback;
