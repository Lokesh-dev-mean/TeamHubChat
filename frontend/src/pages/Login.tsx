import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TextField,
  Button,
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
    <div className="container mx-auto max-w-sm">
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="bg-white p-8 w-full rounded-lg shadow-sm">
          <div className="flex items-center gap-3 justify-center mb-4">
            <BrandLogo size={32} />
            <h1 className="text-xl font-bold">TeamHub</h1>
          </div>
          <p className="text-sm text-gray-600 text-center mb-6">
            Log in to continue
          </p>

          {error && (
            <Alert severity="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
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
              className="mt-6 mb-4 py-3"
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="relative flex items-center justify-center my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative px-4 text-sm text-gray-500 bg-white">
              Or continue with
            </div>
          </div>

          <div className="flex flex-col gap-4">
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
          </div>

          <div className="text-center mt-6">
            <p className="text-sm">
              Don't have an organization?{' '}
              <Link to="/register" className="text-inherit no-underline">
                <strong>Create one here</strong>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;