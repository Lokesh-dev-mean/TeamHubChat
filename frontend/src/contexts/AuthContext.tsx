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
  microsoftAuth: (tenantName?: string, tenantDomain?: string) => Promise<void>;
  microsoftTenantAuth: (domain: string) => Promise<void>;
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
          const storedUser = authService.getUser();
          if (storedUser) {
            // Verify token is still valid
            try {
              const currentUser = await authService.getCurrentUser();
              setUser(currentUser);
            } catch (error) {
              // Token is invalid, clear auth state
              authService.logout();
              setUser(null);
            }
          }
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
      const tenantData = tenantName && tenantDomain ? { tenantName, tenantDomain } : undefined;
      const response = await authService.register(email, password, displayName, tenantData);
      handleAuthResponse(response);
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const googleAuth = async (token: string, tenantName?: string, tenantDomain?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const tenantData = tenantName && tenantDomain ? { tenantName, tenantDomain } : undefined;
      const response = await authService.handleGoogleAuth(token, tenantData);
      handleAuthResponse(response);
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Google authentication failed');
      throw error;
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

  const microsoftAuth = async (tenantName?: string, tenantDomain?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const tenantData = tenantName && tenantDomain ? { tenantName, tenantDomain } : undefined;
      const response = await authService.microsoftLogin(tenantData);
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
    logout,
    error,
    clearError,
  }), [user, isLoading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

