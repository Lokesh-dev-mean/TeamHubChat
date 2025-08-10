import React from 'react';
import { Button } from '@mui/material';
import { Microsoft as MicrosoftIcon } from '@mui/icons-material';
import { useMsal } from '@azure/msal-react';
import { oauthScopes } from '../../config/oauth.config';
import { ButtonVariant } from '../../types/common';

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
  text = 'Continue with Microsoft',
  variant = 'outlined',
  disabled = false,
}) => {
  const { instance } = useMsal();

  const handleMicrosoftLogin = async () => {
    try {
      // Prevent multiple simultaneous calls
      if (disabled) return;
      
      const loginRequest = {
        scopes: oauthScopes.microsoft,
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
