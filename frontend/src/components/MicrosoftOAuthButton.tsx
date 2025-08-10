import React from 'react';
import { Button } from '@mui/material';
// Custom Microsoft logo with brand colors
const MicrosoftLogo: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true" focusable="false">
    <rect width="10" height="10" x="0" y="0" fill="#F25022" />
    <rect width="10" height="10" x="12.5" y="0" fill="#7FBA00" />
    <rect width="10" height="10" x="0" y="12.5" fill="#00A4EF" />
    <rect width="10" height="10" x="12.5" y="12.5" fill="#FFB900" />
  </svg>
);
import { useMsal } from '@azure/msal-react';

// Replace union repetitions with alias (Sonar S4323)
type ButtonVariant = 'contained' | 'outlined' | 'text';

interface MicrosoftOAuthButtonProps {
  onSuccess: (accessToken: string) => void;
  onError: (error: string) => void;
  text?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
}

const getButtonColor = (variant: ButtonVariant) => {
  if (variant === 'outlined') return '#0078d4';
  if (variant === 'contained') return 'white';
  return '#0078d4';
};

const getHoverBackgroundColor = (variant: ButtonVariant) => {
  if (variant === 'outlined') return '#f3f2f1';
  if (variant === 'contained') return '#106ebe';
  return undefined;
};

const MicrosoftOAuthButton: React.FC<MicrosoftOAuthButtonProps> = ({
  onSuccess,
  onError,
  text = 'Microsoft',
  variant = 'outlined',
  disabled = false,
}) => {
  const { instance } = useMsal();

  const handleMicrosoftLogin = async () => {
    try {
      // Prevent multiple simultaneous calls
      if (disabled) return;
      
      const loginRequest = {
        scopes: ['user.read', 'openid', 'profile', 'email'],
        prompt: 'select_account',
        extraQueryParameters: {},
      };

      // Use loginPopup for registration (new users)
      const response = await instance.loginPopup(loginRequest);
      
      if (response && response.accessToken) {
        onSuccess(response.accessToken);
      } else {
        onError('Microsoft authentication failed - no access token received');
      }
    } catch (error: any) {
      console.error('Microsoft OAuth error:', error);
      
      // Handle specific MSAL errors
      if (error.errorCode === 'user_cancelled') {
        onError('Microsoft authentication was cancelled');
      } else if (error.errorCode === 'popup_window_error' || error.errorCode === 'popup_window_timeout') {
        onError('Microsoft authentication popup was blocked. Please allow popups and try again.');
      } else if (error.errorCode === 'interaction_in_progress') {
        onError('Microsoft authentication is already in progress. Please wait and try again.');
      } else if (error.errorCode === 'invalid_client') {
        onError('Microsoft OAuth configuration error. Please check your client ID.');
      } else {
        onError(`Microsoft authentication failed: ${error.errorMessage || error.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <Button
      fullWidth
      variant={variant}
      startIcon={<MicrosoftLogo />}
      onClick={handleMicrosoftLogin}
      disabled={disabled}
      sx={{
        textTransform: 'none',
        py: 1.1,
        minHeight: 44,
        borderRadius: 1.5,
        backgroundColor: variant === 'contained' ? '#0078D4' : '#ffffff',
        borderColor: '#E2E8F0',
        color: variant === 'contained' ? '#ffffff' : 'rgb(15,23,42)',
        '&:hover': {
          backgroundColor: variant === 'contained' ? '#106EBE' : '#F8FAFC',
          borderColor: '#CBD5E1',
        },
      }}
    >
      {text}
    </Button>
  );
};

export default MicrosoftOAuthButton;
