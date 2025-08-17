import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { authService, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginToTenant: (domain: string, email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    tenantName?: string,
    tenantDomain?: string
  ) => Promise<void>;
  googleAuth: (token: string, tenantName?: string, tenantDomain?: string) => Promise<void>;
  googleTenantAuth: (domain: string, token: string) => Promise<void>;
  microsoftAuth: (accessToken: string, tenantName?: string, tenantDomain?: string) => Promise<void>;
  microsoftTenantAuth: (domain: string) => Promise<void>;
  completeGoogleRegistration: (idToken: string, tenantName: string, tenantDomain?: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize auth state from localStorage
    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          // If we have a token, fetch fresh user from backend
          try {
            const hasMethod = typeof (authService as any).getCurrentUser === 'function';
            if (hasMethod) {
              const currentUser = await (authService as any).getCurrentUser();
              setUser(currentUser);
            } else {
              const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              const token = localStorage.getItem('token');
              const resp = await fetch(`${apiBase}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!resp.ok) throw new Error(`Failed to load user: ${resp.status}`);
              const data = await resp.json();
              setUser(data?.data?.user ?? null);
            }
          } catch (error) {
            console.error('Failed to get current user:', error);
            authService.logout();
            setUser(null);
          }
        } else {
          // No token -> ensure logged out state
          authService.logout();
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        authService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearError = () => {
    setError(null);
  };

  const handleAuthResponse = (response: any) => {
    if (response.success) {
      setUser(response.data.user);
      setError(null);
    } else {
      throw new Error(response.message);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.login(email, password);
      handleAuthResponse(response);
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginToTenant = async (domain: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.loginToTenant(domain, email, password);
      handleAuthResponse(response);
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Tenant login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    tenantName?: string,
    tenantDomain?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const tenantData = tenantName ? {
        tenantName,
        tenantDomain: tenantDomain || tenantName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
      } : undefined;
      
      const response = await authService.register(email, password, displayName, tenantData);
      handleAuthResponse(response);
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const googleAuth = async (code: string, tenantName?: string, tenantDomain?: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First exchange the code for tokens
      const exchangeResponse = await authService.exchangeGoogleCode(code);
      
      if (!exchangeResponse.success || !exchangeResponse.data?.idToken) {
        throw new Error('Failed to exchange authorization code');
      }
      
      const tenantData = tenantName ? {
        tenantName,
        tenantDomain: tenantDomain || tenantName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
      } : undefined;
      
      // Persist ID token in case backend requires tenant details to complete registration
      sessionStorage.setItem('pending_google_id_token', exchangeResponse.data.idToken);
      
      // Then authenticate with the ID token
      const response = await authService.handleGoogleAuth(exchangeResponse.data.idToken, tenantData);
      handleAuthResponse(response);
      // Clean up pending token on success
      sessionStorage.removeItem('pending_google_id_token');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Google authentication failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const completeGoogleRegistration = async (
    idToken: string,
    tenantName: string,
    tenantDomain?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const tenantData = {
        tenantName,
        tenantDomain: tenantDomain || tenantName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
      };
      const response = await authService.handleGoogleAuth(idToken, tenantData);
      handleAuthResponse(response);
      sessionStorage.removeItem('pending_google_id_token');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Google registration failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const googleTenantAuth = async (domain: string, token: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.handleGoogleTenantAuth(domain, token);
      handleAuthResponse(response);
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Google tenant authentication failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const microsoftAuth = async (accessToken: string, tenantName?: string, tenantDomain?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const tenantData = tenantName ? {
        tenantName,
        tenantDomain: tenantDomain || tenantName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
      } : undefined;
      
      const response = await authService.handleMicrosoftAuth(accessToken, tenantData);
      handleAuthResponse(response);
    } catch (error: any) {
      setError(error.message || 'Microsoft authentication failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const microsoftTenantAuth = async (domain: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.microsoftTenantLogin(domain);
      handleAuthResponse(response);
    } catch (error: any) {
      setError(error.message || 'Microsoft tenant authentication failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };



  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logoutUser();
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if API call fails
      authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginToTenant,
    register,
    googleAuth,
    googleTenantAuth,
    microsoftAuth,
    microsoftTenantAuth,
    completeGoogleRegistration,
    logout,
    error,
    clearError,
  }), [user, isLoading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

