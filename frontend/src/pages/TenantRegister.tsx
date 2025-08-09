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
  Business as BusinessIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Domain as DomainIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import GoogleOAuthButton from '../components/GoogleOAuthButton';
import MicrosoftOAuthButton from '../components/MicrosoftOAuthButton';

const TenantRegister: React.FC = () => {
  const navigate = useNavigate();
  const { register, googleAuth, microsoftAuth, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    tenantName: '',
    tenantDomain: '',
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

    if (!formData.tenantDomain) {
      errors.tenantDomain = 'Organization domain is required';
    } else if (!/^[a-zA-Z0-9-]+$/.test(formData.tenantDomain)) {
      errors.tenantDomain = 'Domain can only contain letters, numbers, and hyphens';
    } else if (formData.tenantDomain.length < 2) {
      errors.tenantDomain = 'Domain must be at least 2 characters';
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

    // Auto-generate domain from tenant name if domain is empty
    if (field === 'tenantName' && !formData.tenantDomain) {
      const domain = value.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
      setFormData(prev => ({ ...prev, tenantDomain: domain }));
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
        formData.tenantName,
        formData.tenantDomain
      );
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleGoogleSuccess = async (token: string) => {
    try {
      await googleAuth(token, formData.tenantName, formData.tenantDomain);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleGoogleError = (error: string) => {
    console.error('Google OAuth error:', error);
  };

  const handleMicrosoftSuccess = async (accessToken: string) => {
    try {
      await microsoftAuth(formData.tenantName, formData.tenantDomain);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleMicrosoftError = (error: string) => {
    console.error('Microsoft OAuth error:', error);
  };

  const isOAuthReady = formData.tenantName && formData.tenantDomain && !formErrors.tenantName && !formErrors.tenantDomain;

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
            <BusinessIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Create Your Organization
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Set up your TeamHub workspace and become the admin
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Organization Information */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
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

            <TextField
              fullWidth
              label="Organization Domain"
              value={formData.tenantDomain}
              onChange={handleInputChange('tenantDomain')}
              error={!!formErrors.tenantDomain}
              helperText={formErrors.tenantDomain || 'This will be your organization\'s unique identifier'}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DomainIcon />
                  </InputAdornment>
                ),
              }}
            />

            {/* Admin User Information */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
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
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Create Organization'}
            </Button>
          </form>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              or create with
            </Typography>
          </Divider>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <GoogleOAuthButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="Create with Google"
              disabled={!isOAuthReady || isLoading}
            />
            
            <MicrosoftOAuthButton
              onSuccess={handleMicrosoftSuccess}
              onError={handleMicrosoftError}
              text="Create with Microsoft"
              disabled={!isOAuthReady || isLoading}
            />
          </Box>

          {!isOAuthReady && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Please fill in organization details to enable OAuth registration
            </Alert>
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

