# OAuth Providers Setup Guide

## 1. Create Your .env File

Create a `.env` file in the `backend` directory with the following OAuth configurations:

```bash
# Copy this to your .env file
# ===========================================
# OAUTH PROVIDERS SETUP
# ===========================================

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Microsoft OAuth Configuration  
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
MICROSOFT_TENANT_ID="common"

# GitHub OAuth Configuration
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Also include your other required variables:
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://username:password@localhost:5432/teamhub"
JWT_SECRET="your-super-secret-jwt-key-256-bit"
FRONTEND_URL=http://localhost:3000
```

## 2. Google OAuth Setup

### Step 1: Create Google OAuth App
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set Application type to "Web application"
6. Add authorized origins:
   - `http://localhost:3000`
   - `http://localhost:5000`
7. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback`

### Step 2: Update .env
```bash
GOOGLE_CLIENT_ID="123456789-abc123def456.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-secret-here"
```

## 3. Microsoft OAuth Setup

### Step 1: Create Microsoft App Registration
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Set redirect URI: `http://localhost:3000/auth/microsoft/callback`
5. Under "API permissions", add Microsoft Graph permissions:
   - `User.Read`
   - `email`
   - `profile`

### Step 2: Update .env
```bash
MICROSOFT_CLIENT_ID="12345678-1234-1234-1234-123456789abc"
MICROSOFT_CLIENT_SECRET="your-client-secret-here"
MICROSOFT_TENANT_ID="common"
```

## 4. GitHub OAuth Setup

### Step 1: Create GitHub OAuth App
1. Go to [GitHub Settings](https://github.com/settings/applications/new)
2. Fill in the form:
   - Application name: "TeamHub Platform"
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`
3. Click "Register application"

### Step 2: Update .env
```bash
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

## 5. Test OAuth Configuration

After setting up your `.env` file, restart your backend server:

```bash
cd backend
npm run dev
```

Check the console output. You should see:
```
✅ OAuth Providers Enabled:
- Google OAuth: ✓ Configured
- Microsoft OAuth: ✓ Configured  
- GitHub OAuth: ✓ Configured
```

If any provider shows "✗ Not configured", double-check your .env variables.

## 6. Frontend OAuth Libraries

Install the required frontend OAuth libraries:

```bash
# For Google OAuth
npm install @google-cloud/local-auth google-auth-library

# For Microsoft OAuth
npm install @azure/msal-browser @azure/msal-react

# For GitHub OAuth (server-side flow)
# No additional packages needed - uses redirect flow
```

## Next Steps

1. ✅ Create your `.env` file with OAuth credentials
2. ✅ Set up OAuth apps with the providers
3. ✅ Test the backend OAuth endpoints
4. ✅ Implement frontend OAuth flows
5. ✅ Test complete registration and login flows

