# TeamHub - OAuth Tenant Registration & Login Guide

## Overview

TeamHub supports OAuth authentication with Google, Microsoft, and GitHub for both tenant registration and tenant-specific login. This guide covers all OAuth flows with complete tenant management.

## Table of Contents

1. [OAuth Tenant Registration](#oauth-tenant-registration)
2. [OAuth Tenant-Specific Login](#oauth-tenant-specific-login)
3. [OAuth General Login](#oauth-general-login)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration Examples](#frontend-integration-examples)
6. [OAuth Configuration](#oauth-configuration)
7. [Security Features](#security-features)

## OAuth Tenant Registration

### 1. Google OAuth Tenant Registration

Create a new organization using Google OAuth.

**Endpoint:** `POST /api/auth/google`

**Request Body:**
```json
{
  "token": "google-id-token-from-frontend",
  "tenantName": "My Company",
  "tenantDomain": "mycompany"
}
```

**What Happens:**
1. ✅ Verifies Google ID token
2. ✅ Checks email verification status
3. ✅ Validates domain format and uniqueness
4. ✅ Creates tenant with default settings
5. ✅ Creates user with **admin role** (first user)
6. ✅ Generates JWT token
7. ✅ Creates comprehensive audit logs

**Response:**
```json
{
  "success": true,
  "message": "User registered and logged in successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@gmail.com",
      "displayName": "John Admin",
      "avatarUrl": "https://lh3.googleusercontent.com/...",
      "role": "admin",
      "tenantId": "tenant-uuid",
      "tenant": {
        "name": "My Company",
        "domain": "mycompany",
        "settings": {
          "allowGuestAccess": false,
          "requireInviteApproval": true,
          "maxFileSize": 52428800
        }
      },
      "isFirstUser": true
    },
    "token": "jwt-token"
  }
}
```

### 2. Microsoft OAuth Tenant Registration

**Endpoint:** `POST /api/auth/microsoft`

**Request Body:**
```json
{
  "accessToken": "microsoft-access-token-from-frontend",
  "tenantName": "My Company",
  "tenantDomain": "mycompany"
}
```

**Features:**
- ✅ Retrieves user info from Microsoft Graph API
- ✅ Handles both `mail` and `userPrincipalName` fields
- ✅ Creates tenant with admin user
- ✅ Comprehensive error handling

### 3. GitHub OAuth Tenant Registration

**Endpoint:** `POST /api/auth/github`

**Request Body:**
```json
{
  "accessToken": "github-access-token-from-frontend",
  "tenantName": "My Company",
  "tenantDomain": "mycompany"
}
```

**Features:**
- ✅ Retrieves user info from GitHub API
- ✅ Requires public email address
- ✅ Uses GitHub avatar if available
- ✅ Creates tenant with admin user

## OAuth Tenant-Specific Login

More secure login where users must belong to a specific organization.

### 1. Google OAuth to Specific Tenant

**Endpoint:** `POST /api/auth/tenant/{domain}/google`

**Request Body:**
```json
{
  "token": "google-id-token-from-frontend"
}
```

**What Happens:**
1. ✅ Finds tenant by domain
2. ✅ Verifies Google token
3. ✅ Finds user within that specific tenant
4. ✅ Checks if user is active
5. ✅ Updates last login time
6. ✅ Creates tenant-specific audit log

**Benefits:**
- **Enhanced Security**: User must belong to the specific tenant
- **Better Audit Trail**: Tenant-specific login tracking
- **Account Status Checks**: Prevents deactivated users from logging in
- **Isolation**: Prevents cross-tenant access attempts

### 2. Microsoft OAuth to Specific Tenant

**Endpoint:** `POST /api/auth/tenant/{domain}/microsoft`

**Request Body:**
```json
{
  "accessToken": "microsoft-access-token-from-frontend"
}
```

### 3. GitHub OAuth to Specific Tenant

**Endpoint:** `POST /api/auth/tenant/{domain}/github`

**Request Body:**
```json
{
  "accessToken": "github-access-token-from-frontend"
}
```

## OAuth General Login

Login across all tenants (less secure but convenient).

### Available Endpoints:
- `POST /api/auth/google` (without tenant info)
- `POST /api/auth/microsoft` (without tenant info)
- `POST /api/auth/github` (without tenant info)

## API Endpoints Summary

### OAuth Tenant Registration

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/google` | Google OAuth tenant registration/login |
| POST | `/api/auth/microsoft` | Microsoft OAuth tenant registration/login |
| POST | `/api/auth/github` | GitHub OAuth tenant registration/login |

### OAuth Tenant-Specific Login

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/tenant/{domain}/google` | Google OAuth to specific tenant |
| POST | `/api/auth/tenant/{domain}/microsoft` | Microsoft OAuth to specific tenant |
| POST | `/api/auth/tenant/{domain}/github` | GitHub OAuth to specific tenant |

### Tenant Discovery

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/auth/tenant/{domain}` | Check if tenant exists |

## Frontend Integration Examples

### 1. Google OAuth Tenant Registration

```javascript
// Frontend: Get Google ID token first
const handleGoogleSignIn = async (googleResponse) => {
  try {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: googleResponse.credential, // Google ID token
        tenantName: 'My Company',
        tenantDomain: 'mycompany'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Store token and user info
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      // Redirect based on user role
      if (data.data.user.isFirstUser) {
        window.location.href = '/admin/setup';
      } else {
        window.location.href = '/dashboard';
      }
    }
  } catch (error) {
    console.error('Google OAuth failed:', error);
  }
};
```

### 2. Microsoft OAuth Tenant Registration

```javascript
// Frontend: Get Microsoft access token first
const handleMicrosoftSignIn = async (microsoftResponse) => {
  try {
    const response = await fetch('/api/auth/microsoft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: microsoftResponse.accessToken,
        tenantName: 'My Company',
        tenantDomain: 'mycompany'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Microsoft OAuth failed:', error);
  }
};
```

### 3. Tenant-Specific OAuth Login

```javascript
// Step 1: Discover tenant
const checkTenant = async (domain) => {
  try {
    const response = await fetch(`/api/auth/tenant/${domain}`);
    return await response.json();
  } catch (error) {
    return null;
  }
};

// Step 2: Google OAuth to specific tenant
const handleTenantGoogleLogin = async (domain, googleToken) => {
  try {
    const response = await fetch(`/api/auth/tenant/${domain}/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: googleToken
      })
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      window.location.href = '/dashboard';
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Tenant Google login failed:', error);
    // Handle specific errors
    if (error.message.includes('not found in this organization')) {
      alert('You are not a member of this organization. Please contact your administrator.');
    }
  }
};

// Complete flow
const loginToTenant = async (domain) => {
  // First check if tenant exists
  const tenantInfo = await checkTenant(domain);
  if (!tenantInfo?.success) {
    alert('Organization not found');
    return;
  }

  // Show tenant info and OAuth options
  console.log('Logging into:', tenantInfo.data.tenant.name);
  
  // Initialize Google Sign-In for this tenant
  // Then call handleTenantGoogleLogin when user clicks Google button
};
```

### 4. GitHub OAuth Tenant Registration

```javascript
// Frontend: Get GitHub access token first (requires OAuth app setup)
const handleGitHubSignIn = async (githubToken) => {
  try {
    const response = await fetch('/api/auth/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: githubToken,
        tenantName: 'My Company',
        tenantDomain: 'mycompany'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('GitHub OAuth failed:', error);
  }
};
```

## OAuth Configuration

### Environment Variables Required

```bash
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Microsoft OAuth
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
MICROSOFT_TENANT_ID="common"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### Frontend OAuth Setup

#### Google OAuth Setup
```html
<!-- Include Google Sign-In JavaScript -->
<script src="https://accounts.google.com/gsi/client" async defer></script>

<script>
// Initialize Google Sign-In
window.onload = function () {
  google.accounts.id.initialize({
    client_id: 'your-google-client-id.apps.googleusercontent.com',
    callback: handleGoogleSignIn
  });
  
  google.accounts.id.renderButton(
    document.getElementById('googleSignInButton'),
    { theme: 'outline', size: 'large' }
  );
};
</script>
```

#### Microsoft OAuth Setup
```javascript
// Using MSAL (Microsoft Authentication Library)
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: 'your-microsoft-client-id',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

const handleMicrosoftLogin = async () => {
  try {
    const response = await msalInstance.loginPopup({
      scopes: ['user.read']
    });
    
    // Use response.accessToken for backend API call
    handleMicrosoftSignIn(response);
  } catch (error) {
    console.error('Microsoft login failed:', error);
  }
};
```

#### GitHub OAuth Setup
```javascript
// GitHub OAuth requires server-side flow
// 1. Redirect user to GitHub authorization URL
const initiateGitHubOAuth = () => {
  const clientId = 'your-github-client-id';
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth/github/callback`);
  const scope = encodeURIComponent('user:email');
  
  window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
};

// 2. Handle callback with authorization code
// This requires a backend endpoint to exchange code for access token
```

## Security Features

### 1. Enhanced Validation
- ✅ **Google**: Email verification required
- ✅ **Microsoft**: Handles multiple email field formats
- ✅ **GitHub**: Requires public email address
- ✅ **Domain validation**: Letters, numbers, hyphens only
- ✅ **Token validation**: Proper OAuth token verification

### 2. User Account Security
- ✅ **Account status checks**: Prevents deactivated users from logging in
- ✅ **Last login tracking**: Updates login timestamps
- ✅ **Role assignment**: First user becomes admin automatically
- ✅ **Tenant isolation**: Users are scoped to their specific tenant

### 3. Audit Logging
- ✅ **Tenant creation**: Logs when new tenants are created via OAuth
- ✅ **User registration**: Tracks OAuth user registrations
- ✅ **Login tracking**: Records all OAuth login attempts
- ✅ **Tenant-specific logs**: Separate audit trails per organization

### 4. Error Handling
- ✅ **Provider availability**: Checks if OAuth providers are configured
- ✅ **Token validation**: Proper error messages for invalid tokens
- ✅ **User not found**: Clear messages for tenant-specific login failures
- ✅ **Account deactivation**: Specific error for inactive accounts

## Typical OAuth Flows

### 1. Organization Creator (OAuth Registration)
1. User visits registration page
2. Selects OAuth provider (Google/Microsoft/GitHub)
3. Completes OAuth flow with provider
4. Provides organization details
5. System creates tenant + admin user
6. User gets admin access to dashboard

### 2. Existing User (Tenant-Specific OAuth Login)
1. User enters organization domain
2. System discovers tenant and shows OAuth options
3. User selects OAuth provider
4. System verifies user belongs to that tenant
5. User gets access to their organization

### 3. Existing User (General OAuth Login)
1. User clicks OAuth provider button
2. System finds user across all tenants
3. User gets access to their organization

## Error Scenarios & Handling

### Common Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "token",
      "message": "Google token is required"
    }
  ]
}
```

### Specific Error Cases

1. **OAuth Not Configured**
   ```json
   {
     "success": false,
     "message": "Google OAuth is not configured"
   }
   ```

2. **User Not in Tenant**
   ```json
   {
     "success": false,
     "message": "User not found in this organization. Please contact your administrator."
   }
   ```

3. **Account Deactivated**
   ```json
   {
     "success": false,
     "message": "Account is deactivated. Please contact your administrator."
   }
   ```

4. **Domain Already Exists**
   ```json
   {
     "success": false,
     "message": "Organization domain already exists"
   }
   ```

## Best Practices

### 1. Frontend Implementation
- **Always validate tokens** on the frontend before sending to backend
- **Handle errors gracefully** with user-friendly messages
- **Store tokens securely** using httpOnly cookies or secure localStorage
- **Implement proper loading states** during OAuth flows

### 2. Backend Security
- **Validate all OAuth tokens** server-side
- **Check user account status** before allowing login
- **Log all authentication attempts** for audit purposes
- **Use tenant-specific endpoints** for better security

### 3. User Experience
- **Show tenant information** before login attempts
- **Provide clear error messages** for failed authentications
- **Handle edge cases** like missing email addresses
- **Implement proper redirects** based on user roles

## Next Steps

1. **Configure OAuth providers** in your environment
2. **Set up frontend OAuth libraries** (Google Sign-In, MSAL, etc.)
3. **Test all OAuth flows** with real provider tokens
4. **Implement error handling** in your frontend
5. **Set up proper redirects** based on user roles

## Related Documentation

- [Tenant Registration & Login Guide](./TENANT_FLOW_GUIDE.md)
- [Admin Dashboard API](./admin-api.md)
- [Environment Configuration](./environment-setup.md)
- [Security Best Practices](./security-guide.md)

---

**🎉 Your OAuth tenant registration and login flows are now complete and production-ready!**
