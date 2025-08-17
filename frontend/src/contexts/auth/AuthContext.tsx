import React, { createContext, useContext, useEffect, useReducer, useMemo } from 'react';
import { authService } from '../../services/authService';
import { AuthContextType, TenantData } from './types';
import { authReducer, initialState } from './AuthReducer';

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
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          try {
            const currentUser = await authService.getCurrentUser();
            if (!currentUser) {
              throw new Error('No user data returned');
            }
            dispatch({ type: 'SET_USER', payload: currentUser });
          } catch (error) {
            console.error('Failed to get current user:', error);
            authService.logout();
            dispatch({ type: 'SET_USER', payload: null });
          }
        } else {
          authService.logout();
          dispatch({ type: 'SET_USER', payload: null });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        authService.logout();
        dispatch({ type: 'SET_USER', payload: null });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const handleAuthResponse = (response: any) => {
    if (response.success) {
      dispatch({ type: 'SET_USER', payload: response.data.user });
    } else {
      throw new Error(response.message);
    }
  };

  const prepareTenantData = (tenantName?: string, tenantDomain?: string): TenantData | undefined => {
    if (!tenantName) return undefined;
    
    return {
      tenantName,
      tenantDomain: tenantDomain || tenantName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
    };
  };

  const withLoading = async <T,>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      return await operation();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || errorMessage;
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = (email: string, password: string) =>
    withLoading(
      async () => handleAuthResponse(await authService.login(email, password)),
      'Login failed'
    );

  const loginToTenant = (domain: string, email: string, password: string) =>
    withLoading(
      async () => handleAuthResponse(await authService.loginToTenant(domain, email, password)),
      'Tenant login failed'
    );

  const register = (
    email: string,
    password: string,
    displayName: string,
    tenantName?: string,
    tenantDomain?: string
  ) =>
    withLoading(
      async () => {
        const tenantData = prepareTenantData(tenantName, tenantDomain);
        const response = await authService.register(email, password, displayName, tenantData);
        handleAuthResponse(response);
      },
      'Registration failed'
    );

  const googleAuth = async (code: string, tenantName?: string, tenantDomain?: string) =>
    withLoading(
      async () => {
        const exchangeResponse = await authService.exchangeGoogleCode(code);
        if (!exchangeResponse.success || !exchangeResponse.data?.idToken) {
          throw new Error('Failed to exchange authorization code');
        }
        
        const tenantData = prepareTenantData(tenantName, tenantDomain);
        const response = await authService.handleGoogleAuth(exchangeResponse.data.idToken, tenantData);
        handleAuthResponse(response);
      },
      'Google authentication failed'
    );

  const googleTenantAuth = (domain: string, token: string) =>
    withLoading(
      async () => handleAuthResponse(await authService.handleGoogleTenantAuth(domain, token)),
      'Google tenant authentication failed'
    );

  const microsoftAuth = (accessToken: string, tenantName?: string, tenantDomain?: string) =>
    withLoading(
      async () => {
        const tenantData = prepareTenantData(tenantName, tenantDomain);
        const response = await authService.handleMicrosoftAuth(accessToken, tenantData);
        handleAuthResponse(response);
      },
      'Microsoft authentication failed'
    );

  const microsoftTenantAuth = (domain: string) =>
    withLoading(
      async () => handleAuthResponse(await authService.microsoftTenantLogin(domain)),
      'Microsoft tenant authentication failed'
    );

  const logout = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await authService.logoutUser();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if API call fails
      authService.logout();
      dispatch({ type: 'LOGOUT' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  const value = useMemo(
    () => ({
      ...state,
      isAuthenticated: !!state.user,
      login,
      loginToTenant,
      register,
      googleAuth,
      googleTenantAuth,
      microsoftAuth,
      microsoftTenantAuth,
      logout,
      clearError,
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
