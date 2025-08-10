import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

const OAuthTest: React.FC = () => {
  const testGoogleOAuth = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    
    console.log('Environment variables:');
    console.log('VITE_GOOGLE_CLIENT_ID:', clientId);
    console.log('Redirect URI:', redirectUri);
    console.log('Current origin:', window.location.origin);
    
    if (!clientId) {
      alert('Google Client ID not found in environment variables!');
      return;
    }
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', 'openid email profile');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', 'test-state-123');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    
    console.log('OAuth URL:', authUrl.toString());
    
    // Open in new tab for testing
    window.open(authUrl.toString(), '_blank');
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        OAuth Test Page
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Environment Variables
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
          VITE_GOOGLE_CLIENT_ID: {import.meta.env.VITE_GOOGLE_CLIENT_ID || 'NOT FOUND'}
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
          VITE_API_URL: {import.meta.env.VITE_API_URL || 'NOT FOUND'}
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          Current Origin: {window.location.origin}
        </Typography>
      </Paper>
      
      <Button 
        variant="contained" 
        color="primary" 
        onClick={testGoogleOAuth}
        sx={{ mr: 2 }}
      >
        Test Google OAuth (New Tab)
      </Button>
      
      <Button 
        variant="outlined" 
        onClick={() => window.location.href = '/register'}
      >
        Back to Register
      </Button>
    </Box>
  );
};

export default OAuthTest;
