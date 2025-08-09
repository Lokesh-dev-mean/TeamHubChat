import React from 'react';
import { Button } from '@mui/material';
import { Microsoft as MicrosoftIcon } from '@mui/icons-material';
import { useMsal } from '@azure/msal-react';

interface MicrosoftOAuthButtonProps {
  onSuccess: (accessToken: string) => void;
  onError: (error: string) => void;
  text?: string;
  variant?: 'contained' | 'outlined' | 'text';
  disabled?: boolean;
}

const getButtonColor = (variant: 'contained' | 'outlined' | 'text') => {
  if (variant === 'outlined') return '#0078d4';
  if (variant === 'contained') return 'white';
  return '#0078d4';
};

const getHoverBackgroundColor = (variant: 'contained' | 'outlined' | 'text') => {
  if (variant === 'outlined') return '#f3f2f1';
  if (variant === 'contained') return '#106ebe';
  return undefined;
};

const MicrosoftOAuthButton: React.FC<MicrosoftOAuthButtonProps> = ({
  onSuccess,
  onError,
  text = 'Continue with Microsoft',
  variant = 'outlined',
  disabled = false,
}) => {
  const { instance } = useMsal();

  const handleMicrosoftLogin = async () => {
    try {
      const loginRequest = {
        scopes: ['user.read'],
        prompt: 'select_account',
      };

      const response = await instance.loginPopup(loginRequest);
      
      if (response.accessToken) {
        onSuccess(response.accessToken);
      } else {
        onError('Microsoft authentication failed - no access token received');
      }
    } catch (error: any) {
      console.error('Microsoft OAuth error:', error);
      
      // Handle specific MSAL errors
      if (error.errorCode === 'user_cancelled') {
        onError('Microsoft authentication was cancelled');
      } else if (error.errorCode === 'popup_window_error') {
        onError('Microsoft authentication popup was blocked. Please allow popups and try again.');
      } else {
        onError(error.errorMessage || 'Microsoft authentication failed');
      }
    }
  };

  return (
    <Button
      fullWidth
      variant={variant}
      startIcon={<MicrosoftIcon />}
      onClick={handleMicrosoftLogin}
      disabled={disabled}
      sx={{
        textTransform: 'none',
        py: 1.5,
        backgroundColor: variant === 'contained' ? '#0078d4' : 'transparent',
        borderColor: variant === 'outlined' ? '#0078d4' : undefined,
        color: getButtonColor(variant),
        '&:hover': {
          backgroundColor: getHoverBackgroundColor(variant),
          borderColor: variant === 'outlined' ? '#0078d4' : undefined,
        },
      }}
    >
      {text}
    </Button>
  );
};

export default MicrosoftOAuthButton;
