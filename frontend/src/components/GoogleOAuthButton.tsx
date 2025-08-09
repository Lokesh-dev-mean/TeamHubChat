import React, { useEffect, useRef } from 'react';
import { Button, Box } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';

interface GoogleOAuthButtonProps {
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  text?: string;
  variant?: 'contained' | 'outlined' | 'text';
  disabled?: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

const GoogleOAuthButton: React.FC<GoogleOAuthButtonProps> = ({
  onSuccess,
  onError,
  text = 'Continue with Google',
  variant = 'outlined',
  disabled = false,
}) => {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const isGoogleLoaded = useRef(false);

  useEffect(() => {
    const loadGoogleScript = () => {
      if (window.google || isGoogleLoaded.current) {
        initializeGoogle();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        isGoogleLoaded.current = true;
        initializeGoogle();
      };
      script.onerror = () => {
        onError('Failed to load Google OAuth script');
      };
      document.head.appendChild(script);
    };

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(initializeGoogle, 100);
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      } catch (error) {
        console.error('Google OAuth initialization failed:', error);
        onError('Google OAuth initialization failed');
      }
    };

    const handleCredentialResponse = (response: any) => {
      if (response.credential) {
        onSuccess(response.credential);
      } else {
        onError('Google authentication failed');
      }
    };

    loadGoogleScript();

    return () => {
      // Cleanup if needed
    };
  }, [onSuccess, onError]);

  const handleGoogleLogin = () => {
    if (!window.google?.accounts?.id) {
      onError('Google OAuth not initialized');
      return;
    }

    try {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to renderButton if prompt doesn't work
          if (googleButtonRef.current) {
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              theme: 'outline',
              size: 'large',
              width: '100%',
            });
          }
        }
      });
    } catch (error) {
      console.error('Google login failed:', error);
      onError('Google login failed');
    }
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
      <div ref={googleButtonRef} style={{ display: 'none' }} />
    </Box>
  );
};

export default GoogleOAuthButton;

