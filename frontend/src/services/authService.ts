import axios from 'axios';
import { PublicClientApplication } from '@azure/msal-browser';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    domain: string;
    settings?: any;
  };
  isFirstUser?: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface TenantInfo {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  settings: {
    allowGuestAccess: boolean;
    requireInviteApproval: boolean;
  };
}

export interface RegisterTenantData {
  tenantName: string;
  tenantDomain: string;
}

// Microsoft OAuth Configuration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

class AuthService {
  private apiClient = axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add token to requests if available
    this.apiClient.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token expiration
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Token Management
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  removeToken(): void {
    localStorage.removeItem('token');
  }

  // User Management
  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  removeUser(): void {
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  logout(): void {
    this.removeToken();
    this.removeUser();
  }

  // Tenant Discovery
  async discoverTenant(domain: string): Promise<TenantInfo | null> {
    try {
      const response = await this.apiClient.get(`/auth/tenant/${domain}`);
      return response.data.data.tenant;
    } catch (error) {
      console.error('Tenant discovery failed:', error);
      return null;
    }
  }

  // Email/Password Authentication
  async register(
    email: string,
    password: string,
    displayName: string,
    tenantData?: RegisterTenantData
  ): Promise<AuthResponse> {
    const response = await this.apiClient.post('/auth/register', {
      email,
      password,
      displayName,
      ...tenantData,
    });
    
    if (response.data.success) {
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }
    
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.apiClient.post('/auth/login', {
      email,
      password,
    });
    
    if (response.data.success) {
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }
    
    return response.data;
  }

  async loginToTenant(domain: string, email: string, password: string): Promise<AuthResponse> {
    const response = await this.apiClient.post(`/auth/tenant/${domain}/login`, {
      email,
      password,
    });
    
    if (response.data.success) {
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }
    
    return response.data;
  }

  // Google OAuth
  async handleGoogleAuth(
    googleToken: string,
    tenantData?: RegisterTenantData
  ): Promise<AuthResponse> {
    const response = await this.apiClient.post('/auth/google', {
      token: googleToken,
      ...tenantData,
    });
    
    if (response.data.success) {
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }
    
    return response.data;
  }

  async handleGoogleTenantAuth(domain: string, googleToken: string): Promise<AuthResponse> {
    const response = await this.apiClient.post(`/auth/tenant/${domain}/google`, {
      token: googleToken,
    });
    
    if (response.data.success) {
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }
    
    return response.data;
  }

  // Microsoft OAuth
  async handleMicrosoftAuth(
    accessToken: string,
    tenantData?: RegisterTenantData
  ): Promise<AuthResponse> {
    const response = await this.apiClient.post('/auth/microsoft', {
      accessToken,
      ...tenantData,
    });
    
    if (response.data.success) {
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }
    
    return response.data;
  }

  async handleMicrosoftTenantAuth(domain: string, accessToken: string): Promise<AuthResponse> {
    const response = await this.apiClient.post(`/auth/tenant/${domain}/microsoft`, {
      accessToken,
    });
    
    if (response.data.success) {
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }
    
    return response.data;
  }

  // GitHub OAuth
  async handleGitHubAuth(
    accessToken: string,
    tenantData?: RegisterTenantData
  ): Promise<AuthResponse> {
    const response = await this.apiClient.post('/auth/github', {
      accessToken,
      ...tenantData,
    });
    
    if (response.data.success) {
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }
    
    return response.data;
  }

  async handleGitHubTenantAuth(domain: string, accessToken: string): Promise<AuthResponse> {
    const response = await this.apiClient.post(`/auth/tenant/${domain}/github`, {
      accessToken,
    });
    
    if (response.data.success) {
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }
    
    return response.data;
  }

  // Microsoft OAuth Helper Methods
  async microsoftLogin(tenantData?: RegisterTenantData): Promise<AuthResponse> {
    try {
      const loginRequest = {
        scopes: ['user.read'],
        prompt: 'select_account',
      };

      const response = await msalInstance.loginPopup(loginRequest);
      return await this.handleMicrosoftAuth(response.accessToken, tenantData);
    } catch (error) {
      throw new Error(`Microsoft OAuth failed: ${error}`);
    }
  }

  async microsoftTenantLogin(domain: string): Promise<AuthResponse> {
    try {
      const loginRequest = {
        scopes: ['user.read'],
        prompt: 'select_account',
      };

      const response = await msalInstance.loginPopup(loginRequest);
      return await this.handleMicrosoftTenantAuth(domain, response.accessToken);
    } catch (error) {
      throw new Error(`Microsoft OAuth failed: ${error}`);
    }
  }

  // Get Current User
  async getCurrentUser(): Promise<User> {
    const response = await this.apiClient.get('/auth/me');
    return response.data.data.user;
  }

  // Logout
  async logoutUser(): Promise<void> {
    try {
      await this.apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.logout();
    }
  }
}

export const authService = new AuthService();

