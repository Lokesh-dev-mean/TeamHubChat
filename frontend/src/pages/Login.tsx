import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import GoogleOAuthButtonDirect from '../components/GoogleOAuthButtonDirect';
import MicrosoftOAuthButton from '../components/MicrosoftOAuthButton';
import BrandLogo from '../components/BrandLogo';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, googleAuth, microsoftAuth, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    
    // Clear errors when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear auth errors
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      // Additional form-specific error handling
      if (error.response?.status === 401) {
        setFormErrors({
          email: 'Invalid email or password',
          password: 'Invalid email or password'
        });
      }
    }
  };

  const handleGoogleSuccess = async (token: string) => {
    try {
      await googleAuth(token);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google OAuth failed:', error);
      // Error is handled by context
      const msg = error?.message?.toLowerCase?.() || '';
      if (msg.includes('register first') || msg.includes('organization details required')) {
        sessionStorage.setItem('oauth_register_reason', 'no_account');
        navigate('/register');
      }
    }
  };

  const handleGoogleError = (error: string) => {
    console.error('Google OAuth error:', error);
  };

  const handleMicrosoftSuccess = async (accessToken: string) => {
    try {
      await microsoftAuth(accessToken);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Microsoft OAuth failed:', error);
      // Error is handled by context
      const msg = error?.message?.toLowerCase?.() || '';
      if (msg.includes('register first') || msg.includes('organization details required')) {
        sessionStorage.setItem('oauth_register_reason', 'no_account');
        navigate('/register');
      }
    }
  };

  const handleMicrosoftError = (error: string) => {
    console.error('Microsoft OAuth error:', error);
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
        <Paper elevation={0} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'center', mb: 2 }}>
            <BrandLogo size={32} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>TeamHub</Typography>
          </Box>
          <Typography variant="body2" align="center" sx={{ mb: 3, color: 'text.secondary' }}>
            Log in to continue
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={!!formErrors.email}
              helperText={formErrors.email}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange('password')}
              error={!!formErrors.password}
              helperText={formErrors.password}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2, py: 1 }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}><Typography variant="caption" color="text.secondary">Or continue with</Typography></Divider>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <GoogleOAuthButtonDirect
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="Sign in with Google"
              disabled={isLoading}
            />
            
            <MicrosoftOAuthButton
              onSuccess={handleMicrosoftSuccess}
              onError={handleMicrosoftError}
              text="Sign in with Microsoft"
              disabled={isLoading}
            />
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2">
              Don't have an organization?{' '}
              <Link to="/register" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>Create one here</strong>
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;