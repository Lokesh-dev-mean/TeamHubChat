import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
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
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Business as BusinessIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Domain as DomainIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { authService, TenantInfo } from '../services/authService';
import GoogleOAuthButton from '../components/GoogleOAuthButton';
import MicrosoftOAuthButton from '../components/MicrosoftOAuthButton';

const TenantLogin: React.FC = () => {
  const navigate = useNavigate();
  const { domain: urlDomain } = useParams<{ domain: string }>();
  const { loginToTenant, googleTenantAuth, microsoftTenantAuth, isLoading, error, clearError } = useAuth();

  const [step, setStep] = useState<'discover' | 'login'>('discover');
  const [domain, setDomain] = useState(urlDomain || '');
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (urlDomain) {
      handleDiscoverTenant(urlDomain);
    }
  }, [urlDomain]);

  const handleDiscoverTenant = async (searchDomain?: string) => {
    const targetDomain = searchDomain || domain.trim();
    
    if (!targetDomain) {
      setDiscoveryError('Please enter an organization domain');
      return;
    }

    setDiscoveryLoading(true);
    setDiscoveryError(null);

    try {
      const tenant = await authService.discoverTenant(targetDomain);
      
      if (tenant) {
        setTenantInfo(tenant);
        setStep('login');
        setDomain(targetDomain);
        
        // Update URL without causing navigation
        window.history.replaceState(null, '', `/login/${targetDomain}`);
      } else {
        setDiscoveryError('Organization not found. Please check the domain and try again.');
      }
    } catch (error) {
      setDiscoveryError('Failed to find organization. Please try again.');
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const handleBackToDiscovery = () => {
    setStep('discover');
    setTenantInfo(null);
    setDomain('');
    setLoginData({ email: '', password: '' });
    setLoginErrors({});
    clearError();
    window.history.replaceState(null, '', '/login');
  };

  const validateLoginForm = () => {
    const errors: Record<string, string> = {};

    if (!loginData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!loginData.password) {
      errors.password = 'Password is required';
    }

    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData(prev => ({ ...prev, [field]: event.target.value }));
    
    // Clear field error when user starts typing
    if (loginErrors[field]) {
      setLoginErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear global error
    if (error) {
      clearError();
    }
  };

  const handleEmailPasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateLoginForm() || !tenantInfo) {
      return;
    }

    try {
      await loginToTenant(tenantInfo.domain, loginData.email, loginData.password);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleGoogleSuccess = async (token: string) => {
    if (!tenantInfo) return;
    
    try {
      await googleTenantAuth(tenantInfo.domain, token);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleGoogleError = (error: string) => {
    console.error('Google OAuth error:', error);
  };

  const handleMicrosoftSuccess = async () => {
    if (!tenantInfo) return;
    
    try {
      await microsoftTenantAuth(tenantInfo.domain);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleMicrosoftError = (error: string) => {
    console.error('Microsoft OAuth error:', error);
  };

  if (step === 'discover') {
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
                Sign in to TeamHub
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Enter your organization domain to get started
              </Typography>
            </Box>

            {discoveryError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {discoveryError}
              </Alert>
            )}

            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleDiscoverTenant(); }}>
              <TextField
                fullWidth
                label="Organization Domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="mycompany"
                helperText="Enter your organization's domain (e.g., mycompany)"
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DomainIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={discoveryLoading || !domain.trim()}
                startIcon={discoveryLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {discoveryLoading ? 'Finding Organization...' : 'Find Organization'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                or
              </Typography>
            </Divider>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" gutterBottom>
                Don't have an organization yet?
              </Typography>
              <Button
                component={Link}
                to="/register"
                variant="outlined"
                size="large"
                sx={{ mt: 1 }}
              >
                Create Organization
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2">
                <Link to="/login/general" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <strong>Sign in without domain</strong>
                </Link>
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Container>
    );
  }

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
          {/* Organization Info Card */}
          {tenantInfo && (
            <Card sx={{ mb: 3, backgroundColor: 'primary.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircleIcon sx={{ color: 'success.main' }} />
                  <Box>
                    <Typography variant="h6">{tenantInfo.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Domain: {tenantInfo.domain}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto' }}>
                    <Chip label="Found" color="success" size="small" />
                  </Box>
                </Box>
                <Button
                  size="small"
                  onClick={handleBackToDiscovery}
                  sx={{ mt: 1 }}
                >
                  Different organization?
                </Button>
              </CardContent>
            </Card>
          )}

          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome back
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to {tenantInfo?.name}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
              {error}
            </Alert>
          )}

          {/* OAuth Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <GoogleOAuthButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="Continue with Google"
              disabled={isLoading}
            />
            
            <MicrosoftOAuthButton
              onSuccess={handleMicrosoftSuccess}
              onError={handleMicrosoftError}
              text="Continue with Microsoft"
              disabled={isLoading}
            />
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              or sign in with email
            </Typography>
          </Divider>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailPasswordLogin}>
            <TextField
              fullWidth
              type="email"
              label="Email Address"
              value={loginData.email}
              onChange={handleLoginInputChange('email')}
              error={!!loginErrors.email}
              helperText={loginErrors.email}
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
              value={loginData.password}
              onChange={handleLoginInputChange('password')}
              error={!!loginErrors.password}
              helperText={loginErrors.password}
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

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2">
              Need to join this organization?{' '}
              <Link to="/invite" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>Use invitation link</strong>
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default TenantLogin;

