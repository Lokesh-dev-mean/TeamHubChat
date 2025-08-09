# TeamHub - Complete Tenant Registration & Login Flow Guide

## Overview

TeamHub supports a multi-tenant architecture where organizations can register their own tenants and manage users within their domain. This guide covers the complete tenant registration and login flow.

## Table of Contents

1. [Tenant Registration Flow](#tenant-registration-flow)
2. [User Login Flows](#user-login-flows)
3. [Invitation System](#invitation-system)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration Examples](#frontend-integration-examples)
6. [Security Considerations](#security-considerations)

## Tenant Registration Flow

### 1. Organization Creator Registration

When someone wants to create a new organization:

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123",
  "displayName": "John Admin",
  "tenantName": "My Company",
  "tenantDomain": "mycompany"
}
```

**What Happens:**
1. ✅ System validates domain format (letters, numbers, hyphens only)
2. ✅ Checks if domain is already taken
3. ✅ Creates new tenant with default settings
4. ✅ Creates first user with **admin role**
5. ✅ Generates JWT token
6. ✅ Creates audit logs for tenant and user creation

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@company.com",
      "displayName": "John Admin",
      "role": "admin",
      "tenantId": "tenant-uuid",
      "tenant": {
        "name": "My Company",
        "domain": "mycompany",
        "settings": {
          "allowGuestAccess": false,
          "requireInviteApproval": true,
          "maxFileSize": 52428800,
          "allowedFileTypes": ["image/jpeg", "image/png", ...]
        }
      },
      "isFirstUser": true
    },
    "token": "jwt-token"
  }
}
```

## User Login Flows

### 1. General Login (Email/Password)

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@company.com",
  "password": "userpassword"
}
```

**What Happens:**
1. ✅ Finds user by email across all tenants
2. ✅ Validates password
3. ✅ Updates last login time
4. ✅ Creates audit log
5. ✅ Returns user data with tenant information

### 2. Tenant-Specific Login (Recommended)

**Endpoint:** `POST /api/auth/tenant/{domain}/login`

**Request Body:**
```json
{
  "email": "user@company.com",
  "password": "userpassword"
}
```

**What Happens:**
1. ✅ Finds tenant by domain
2. ✅ Finds user within that specific tenant
3. ✅ Checks if user is active
4. ✅ Validates password
5. ✅ Updates last login time
6. ✅ Creates audit log with tenant context

**Benefits:**
- More secure (user must belong to specific tenant)
- Better audit trail
- Prevents cross-tenant login attempts

### 3. Tenant Discovery

Before login, frontend can discover if a tenant exists:

**Endpoint:** `GET /api/auth/tenant/{domain}`

**Response:**
```json
{
  "success": true,
  "message": "Organization found",
  "data": {
    "tenant": {
      "id": "uuid",
      "name": "My Company",
      "domain": "mycompany",
      "settings": {
        "allowGuestAccess": false,
        "requireInviteApproval": true
      }
    }
  }
}
```

## Invitation System

### 1. Admin Invites New User

Admin uses the admin dashboard to send invitations (covered in admin endpoints).

### 2. User Receives Invitation

User gets an email with invitation link: `https://app.teamhub.com/invite/{inviteToken}`

### 3. Check Invitation Details

**Endpoint:** `GET /api/auth/invitation/{inviteToken}`

**Response:**
```json
{
  "success": true,
  "message": "Invitation details retrieved",
  "data": {
    "invitation": {
      "email": "newuser@company.com",
      "role": "member",
      "status": "pending",
      "expiresAt": "2024-01-15T10:00:00Z",
      "isExpired": false,
      "isValid": true,
      "tenant": {
        "name": "My Company",
        "domain": "mycompany"
      },
      "invitedBy": {
        "displayName": "John Admin",
        "email": "admin@company.com"
      }
    }
  }
}
```

### 4. Accept Invitation

**Endpoint:** `POST /api/auth/invitation/{inviteToken}/accept`

**Request Body:**
```json
{
  "password": "NewUserPass123",
  "displayName": "Jane User"
}
```

**What Happens:**
1. ✅ Validates invitation token and expiry
2. ✅ Checks if user email already exists
3. ✅ Creates new user with invited role
4. ✅ Updates invitation status to 'accepted'
5. ✅ Generates JWT token
6. ✅ Creates audit log

## API Endpoints Summary

### Authentication Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Create new tenant + admin user |
| POST | `/api/auth/login` | General user login |
| POST | `/api/auth/tenant/{domain}/login` | Tenant-specific login |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/logout` | Logout user |

### Tenant Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/auth/tenant/{domain}` | Discover tenant by domain |

### OAuth Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/google` | Google OAuth login/register |
| POST | `/api/auth/microsoft` | Microsoft OAuth login/register |
| POST | `/api/auth/github` | GitHub OAuth login/register |

### Invitation Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/auth/invitation/{token}` | Get invitation details |
| POST | `/api/auth/invitation/{token}/accept` | Accept invitation |

## Frontend Integration Examples

### 1. Tenant Registration Form

```javascript
// Frontend registration with tenant creation
const registerTenant = async (formData) => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        tenantName: formData.organizationName,
        tenantDomain: formData.organizationDomain
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Store token
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Registration failed:', error);
  }
};
```

### 2. Tenant Discovery + Login

```javascript
// Step 1: Check if tenant exists
const checkTenant = async (domain) => {
  try {
    const response = await fetch(`/api/auth/tenant/${domain}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data.tenant;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Step 2: Login to specific tenant
const loginToTenant = async (domain, email, password) => {
  try {
    const response = await fetch(`/api/auth/tenant/${domain}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      return data.data.user;
    }
    
    throw new Error(data.message);
  } catch (error) {
    throw error;
  }
};
```

### 3. Invitation Acceptance

```javascript
// Check invitation details
const checkInvitation = async (inviteToken) => {
  try {
    const response = await fetch(`/api/auth/invitation/${inviteToken}`);
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

// Accept invitation
const acceptInvitation = async (inviteToken, password, displayName) => {
  try {
    const response = await fetch(`/api/auth/invitation/${inviteToken}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password, displayName })
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      return data.data.user;
    }
    
    throw new Error(data.message);
  } catch (error) {
    throw error;
  }
};
```

## Security Considerations

### 1. Domain Validation
- ✅ Domains can only contain letters, numbers, and hyphens
- ✅ Domain uniqueness is enforced
- ✅ No special characters or spaces allowed

### 2. Password Requirements
- ✅ Minimum 6 characters
- ✅ Must contain uppercase, lowercase, and number
- ✅ Passwords are hashed with bcrypt (12 rounds)

### 3. JWT Security
- ✅ Tokens include user ID and tenant ID
- ✅ Configurable expiration time
- ✅ Secure secret key required

### 4. User Isolation
- ✅ Users are isolated per tenant
- ✅ Cross-tenant access prevented
- ✅ Tenant-specific login enforces boundaries

### 5. Invitation Security
- ✅ Invitations have expiration dates
- ✅ Unique tokens for each invitation
- ✅ Single-use tokens (status tracking)
- ✅ Email validation before user creation

### 6. Audit Logging
- ✅ All tenant creation logged
- ✅ User registration/login tracked
- ✅ Invitation acceptance recorded
- ✅ Tenant-specific audit trails

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

### Status Codes

- **200**: Success (login, data retrieval)
- **201**: Created (registration, invitation acceptance)
- **400**: Bad Request (validation errors, domain taken)
- **401**: Unauthorized (invalid credentials, inactive user)
- **404**: Not Found (tenant not found, invalid invitation)
- **500**: Server Error

## Next Steps

1. **Test the complete flow** using the API endpoints
2. **Implement frontend components** using the examples above
3. **Set up email notifications** for invitations
4. **Configure OAuth providers** if needed
5. **Customize tenant settings** as required

## Related Documentation

- [Admin Dashboard API](./admin-api.md)
- [RBAC System](./rbac-guide.md)
- [OAuth Configuration](./oauth-setup.md)
- [Email Setup](./email-configuration.md)

---

**🎉 Your tenant registration and login flow is now complete and ready to use!**
