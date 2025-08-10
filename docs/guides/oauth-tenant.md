# OAuth Tenant Management Guide

This guide explains how to manage multi-tenant authentication using OAuth in the TeamHub platform.

## Table of Contents
1. [Overview](#overview)
2. [Tenant Registration](#tenant-registration)
3. [Tenant-Specific Login](#tenant-specific-login)
4. [User Management](#user-management)
5. [Security Considerations](#security-considerations)

## Overview

TeamHub supports multi-tenant OAuth authentication, allowing:
- Organization registration with OAuth
- Tenant-specific OAuth login
- User management within tenants
- Role-based access control

## Tenant Registration

### OAuth Registration Flow

1. **User Initiates Registration**
   ```typescript
   // Frontend flow
   const registerWithOAuth = async (provider: 'google' | 'microsoft') => {
     const tenantData = {
       name: 'My Organization',
       domain: 'myorg'
     };
     await authService.oauthRegister(provider, tenantData);
   };
   ```

2. **Backend Processing**
   ```javascript
   // Backend flow
   const handleOAuthRegistration = async (token, tenantData) => {
     // Verify OAuth token
     const userData = await verifyToken(token);
     
     // Create tenant
     const tenant = await createTenant(tenantData);
     
     // Create user as admin
     const user = await createUser({
       ...userData,
       role: 'admin',
       tenantId: tenant.id
     });
     
     return { user, tenant };
   };
   ```

### Tenant Data Validation

- Domain uniqueness check
- Name format validation
- Required fields validation

## Tenant-Specific Login

### Login Flow

1. **Domain Discovery**
   ```typescript
   // Frontend
   const discoverTenant = async (domain: string) => {
     const tenant = await authService.discoverTenant(domain);
     return tenant;
   };
   ```

2. **OAuth Provider Selection**
   ```typescript
   const loginToTenant = async (domain: string, provider: string) => {
     await authService.tenantOAuthLogin(domain, provider);
   };
   ```

3. **Backend Validation**
   ```javascript
   const validateTenantAccess = async (userId, tenantId) => {
     const membership = await prisma.user.findFirst({
       where: { id: userId, tenantId }
     });
     return !!membership;
   };
   ```

## User Management

### Adding Users

1. **Invite Flow**
   ```javascript
   const inviteUser = async (email, role, tenantId) => {
     const invitation = await createInvitation({
       email,
       role,
       tenantId,
       expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
     });
     
     await sendInvitationEmail(invitation);
   };
   ```

2. **Accept Invitation**
   ```javascript
   const acceptInvitation = async (token, oauthData) => {
     const invitation = await validateInvitation(token);
     
     const user = await createUser({
       ...oauthData,
       tenantId: invitation.tenantId,
       role: invitation.role
     });
     
     return user;
   };
   ```

### Role Management

- Admin: Full access
- Moderator: Limited management
- Member: Basic access
- Guest: Read-only access

## Security Considerations

### Token Management

1. **Token Validation**
   ```javascript
   const validateToken = async (token, tenantId) => {
     const decoded = jwt.verify(token, config.jwt.secret);
     
     if (decoded.tenantId !== tenantId) {
       throw new Error('Invalid tenant access');
     }
     
     return decoded;
   };
   ```

2. **Session Management**
   ```javascript
   const manageSession = {
     maxAge: 24 * 60 * 60 * 1000, // 24 hours
     refreshToken: true,
     validateOnEveryRequest: true
   };
   ```

### Best Practices

1. **Domain Validation**
   - Verify domain ownership
   - Prevent domain squatting
   - Regular domain cleanup

2. **Access Control**
   - Role-based permissions
   - Resource isolation
   - Audit logging

3. **Data Protection**
   - Tenant data isolation
   - Encryption at rest
   - Secure communication

For implementation details, see the [OAuth Setup Guide](oauth-setup.md).

