import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { MsalProvider } from '@azure/msal-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { msalInstance } from './services/authService';

// Initialize MSAL properly
msalInstance.initialize().then(() => {
  msalInstance.handleRedirectPromise().catch(error => {
    console.error('MSAL redirect handling failed:', error);
  });
}).catch(error => {
  console.error('MSAL initialization failed:', error);
});
import Register from './pages/Register';
import Login from './pages/Login';
import Layout from './layouts/Layout';
import NotFound from './pages/NotFound';
import LoadingScreen from './components/LoadingScreen';
import GoogleCallback from './pages/GoogleCallback'; 
import Invite from './pages/Invite';
import AcceptInvite from './pages/AcceptInvite';

// Create MUI theme – enterprise look: squared corners, neutral grays, crisp toolbar
const theme = createTheme({
  palette: {
    primary: {
      main: '#0B5ED7', // deeper blue
      light: '#3D8BFF',
      dark: '#094DB0',
    },
    secondary: {
      main: '#6C757D', // neutral gray as secondary
    },
    background: {
      default: '#F3F4F6', // neutral background
      paper: '#FFFFFF',
    },
    divider: 'rgba(145, 158, 171, 0.24)'
  },
  shape: {
    borderRadius: 0,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '10px 16px',
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 0,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          padding: '12px 14px',
          fontSize: 14,
          lineHeight: 1.4,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          paddingTop: 8,
          paddingBottom: 8,
          fontSize: 14,
          lineHeight: 1.4,
        },
        inputAdornedStart: {
          paddingLeft: 0,
          paddingTop: 8,
          paddingBottom: 8,
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          fontSize: '18px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 0,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(145, 158, 171, 0.24)'
        }
      }
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 64,
        }
      }
    }
  },
});

// Protected/Public routes extracted to satisfy Sonar rule
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <LoadingScreen />;
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <LoadingScreen />;
  }
  return !isAuthenticated ? <>{children}</> : <Navigate to="/chat" replace />;
};

 

// Main App Component
const App: React.FC = () => {
  return ( 
      <MsalProvider instance={msalInstance}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <AuthProvider>
              <Router> 
                  <Routes>
                    {/* Public Routes */}
                    <Route
                      path="/"
                      element={
                        <PublicRoute>
                          <Login />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/login"
                      element={
                        <PublicRoute>
                          <Login />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/login/:domain"
                      element={
                        <PublicRoute>
                          <Login />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/register"
                      element={
                        <PublicRoute>
                          <Register />
                        </PublicRoute>
                      }
                    />

                    {/* Public invite routes */}
                    <Route path="/invite/:inviteToken" element={<Invite />} />
                    <Route path="/organization/invite/:inviteToken" element={<AcceptInvite />} />
                    <Route path="/invite/:inviteToken/accept" element={<AcceptInvite />} />

                    {/* OAuth Callback Routes */}
                    <Route path="/auth/google/callback" element={<GoogleCallback />} />
                    
                   
                    {/* Protected Routes (root) */}
                    <Route
                      path="/*"
                      element={
                        <ProtectedRoute>
                          <Layout />
                        </ProtectedRoute>
                      }
                    />

                    {/* 404 Route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes> 
              </Router>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </MsalProvider> 
  );
};

export default App;