# OAuth Setup Guide

This guide provides comprehensive instructions for setting up OAuth authentication in the TeamHub platform.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Provider Setup](#provider-setup)
   - [Google OAuth](#google-oauth)
   - [Microsoft OAuth](#microsoft-oauth)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

## Overview

TeamHub supports OAuth authentication with multiple providers:
- Google OAuth
- Microsoft OAuth (Azure AD)

This guide will walk you through setting up each provider and integrating them with the platform.

## Prerequisites

- Node.js 18+
- Access to Google Cloud Console and/or Azure Portal
- TeamHub platform running locally or deployed
- SSL certificate for production deployment

## Provider Setup

### Google OAuth

1. **Create Google Cloud Project**
   ```bash
   # Visit Google Cloud Console
   https://console.cloud.google.com
   ```

2. **Enable OAuth APIs**
   - Go to APIs & Services > OAuth consent screen
   - Choose User Type (Internal/External)
   - Fill in application information
   - Add scopes: email, profile, openid

3. **Create OAuth Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - Development: http://localhost:3000/auth/google/callback
     - Production: https://your-domain.com/auth/google/callback

4. **Save Credentials**
   - Download JSON credentials
   - Note Client ID and Client Secret

### Microsoft OAuth

1. **Register Azure AD Application**
   ```bash
   # Visit Azure Portal
   https://portal.azure.com
   ```

2. **Configure App Registration**
   - Go to Azure Active Directory
   - App Registrations > New registration
   - Choose supported account types
   - Add redirect URIs:
     - Development: http://localhost:3000/auth/microsoft/callback
     - Production: https://your-domain.com/auth/microsoft/callback

3. **Configure Authentication**
   - Enable ID tokens
   - Enable Access tokens
   - Add required scopes:
     - email
     - profile
     - User.Read

4. **Save Credentials**
   - Note Application (client) ID
   - Generate client secret and save it securely

## Configuration

1. **Backend Environment Variables**
   ```env
   # Google OAuth
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

   # Microsoft OAuth
   MICROSOFT_CLIENT_ID=your-client-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   MICROSOFT_CALLBACK_URL=http://localhost:3000/auth/microsoft/callback
   MICROSOFT_TENANT_ID=common
   ```

2. **Frontend Environment Variables**
   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id
   VITE_MICROSOFT_CLIENT_ID=your-client-id
   ```

## Testing

1. **Test Google OAuth**
   - Visit http://localhost:3000/login
   - Click "Continue with Google"
   - Verify successful authentication
   - Check user creation in database

2. **Test Microsoft OAuth**
   - Visit http://localhost:3000/login
   - Click "Continue with Microsoft"
   - Verify successful authentication
   - Check user creation in database

## Troubleshooting

### Common Issues

1. **Invalid Client ID**
   - Verify client ID in environment variables
   - Check if client ID matches OAuth provider

2. **Redirect URI Mismatch**
   - Verify redirect URIs in provider settings
   - Check for exact match including protocol

3. **CORS Issues**
   - Add domains to allowed origins
   - Check SSL certificate in production

4. **Token Validation Errors**
   - Check token expiration
   - Verify signature validation
   - Check required scopes

### Provider-Specific Issues

1. **Google OAuth**
   - Verify domain verification
   - Check OAuth consent screen settings
   - Verify API enablement

2. **Microsoft OAuth**
   - Check Azure AD permissions
   - Verify tenant configuration
   - Check API permissions

For more detailed troubleshooting steps, see the [OAuth Troubleshooting Guide](oauth-troubleshooting.md).



