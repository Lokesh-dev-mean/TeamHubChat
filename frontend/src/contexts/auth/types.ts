import { User } from '../../services/authService';

export interface TenantData {
  tenantName: string;
  tenantDomain: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
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
  logout: () => Promise<void>;
  clearError: () => void;
}
