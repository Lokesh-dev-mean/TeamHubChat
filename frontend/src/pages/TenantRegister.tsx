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
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Business as BusinessIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import GoogleOAuthButtonDirect from '../components/GoogleOAuthButtonDirect';
import MicrosoftOAuthButton from '../components/MicrosoftOAuthButton';

const TenantRegister: React.FC = () => {
  const navigate = useNavigate();
  const { register, completeGoogleRegistration, microsoftAuth, isLoading, error, clearError } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    tenantName: '',

  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, lowercase letter, and number';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.displayName) {
      errors.displayName = 'Display name is required';
    }

    if (!formData.tenantName) {
      errors.tenantName = 'Organization name is required';
    }



    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear global error
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
      await register(
        formData.email,
        formData.password,
        formData.displayName,
        formData.tenantName
      );
      toast.success('Organization created successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
      const msg = (error instanceof Error && error.message) || 'Registration failed';
      toast.error(msg);
    }
  };

  const handleGoogleSuccess = async (_token: string) => {
    // Not used in redirect flow
  };

  const handleGoogleError = (error: string) => {
    console.error('Google OAuth error:', error);
  };

  const handleMicrosoftSuccess = async (accessToken: string) => {
    try {
      await microsoftAuth(accessToken, formData.tenantName);
      navigate('/dashboard');
    } catch (error) {
      console.error('Microsoft OAuth failed:', error);
      // Error is handled by context
    }
  };

  const handleMicrosoftError = (error: string) => {
    console.error('Microsoft OAuth error:', error);
  };



  const isOAuthReady = formData.tenantName && !formErrors.tenantName;

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <BusinessIcon sx={{ fontSize: 28, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              Create Your Organization
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set up your TeamHub workspace and become the admin
            </Typography>
          </Box>

          {/* Inline error removed; errors are shown via global toasts */}

          <form onSubmit={handleSubmit}>
            {/* Organization Information */}
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, mb: 2, fontWeight: 600 }}>
              Organization Details
            </Typography>
            
            <TextField
              fullWidth
              label="Organization Name"
              value={formData.tenantName}
              onChange={handleInputChange('tenantName')}
              error={!!formErrors.tenantName}
              helperText={formErrors.tenantName}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BusinessIcon />
                  </InputAdornment>
                ),
              }}
            />

            {/* Admin User Information */}
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, mb: 2, fontWeight: 600 }}>
              Admin Account Details
            </Typography>

            <TextField
              fullWidth
              label="Your Full Name"
              value={formData.displayName}
              onChange={handleInputChange('displayName')}
              error={!!formErrors.displayName}
              helperText={formErrors.displayName}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              type="email"
              label="Email Address"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={!!formErrors.email}
              helperText={formErrors.email}
              margin="normal"
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
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={!!formErrors.password}
              helperText={formErrors.password}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              error={!!formErrors.confirmPassword}
              helperText={formErrors.confirmPassword}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
              {isLoading ? <CircularProgress size={24} /> : 'Create Organization'}
            </Button>
          </form>

          {/* Guidance when redirected from OAuth due to missing account */}
          {sessionStorage.getItem('oauth_register_reason') === 'no_account' && (() => { sessionStorage.removeItem('oauth_register_reason'); toast.info('No account found for OAuth login. Please register your organization.'); return null; })()}

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              or create with
            </Typography>
          </Divider>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <GoogleOAuthButtonDirect
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="Create with Google"
              disabled={!isOAuthReady || isLoading}
              tenantName={formData.tenantName}
            />
            
            <MicrosoftOAuthButton
              onSuccess={handleMicrosoftSuccess}
              onError={handleMicrosoftError}
              text="Create with Microsoft"
              disabled={!isOAuthReady || isLoading}
            />


          </Box>

          {/* Removed extra inline guidance per UX feedback */}

          {/* Continue registration if we have a pending Google token */}
          {sessionStorage.getItem('pending_google_id_token') && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Continue registration with your Google account by providing your organization name.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                disabled={isLoading || !formData.tenantName}
                onClick={async () => {
                  const idToken = sessionStorage.getItem('pending_google_id_token');
                  if (!idToken) return;
                  try {
                    await completeGoogleRegistration(idToken, formData.tenantName);
                    toast.success('Registration completed');
                    navigate('/dashboard');
                  } catch (e) {
                    const msg = (e instanceof Error && e.message) || 'Registration failed';
                    toast.error(msg);
                  }
                }}
              >
                Complete Registration
              </Button>
            </Box>
          )}

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2">
              Already have an organization?{' '}
              <Link to="/login" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>Sign in here</strong>
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default TenantRegister;

