# TeamHub Frontend Setup Guide

## Overview

This is a React frontend application with Material-UI components and OAuth authentication for the TeamHub communication platform.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on port 5000

## Installation

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Configuration**
   
   Create a `.env` file in the `frontend` directory:
   ```bash
   # Copy from env.example
   cp env.example .env
   ```

   Update the `.env` file with your OAuth credentials:
   ```bash
   # Backend API URL
   VITE_API_URL=http://localhost:5000/api

   # Google OAuth (get from Google Cloud Console)
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

   # Microsoft OAuth (get from Azure Portal)
   VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Features Implemented

### ✅ Authentication System
- **Tenant Registration** - Create new organizations with OAuth or email/password
- **Tenant Discovery** - Find organizations by domain
- **Tenant-Specific Login** - Secure login to specific organizations
- **OAuth Integration** - Google and Microsoft OAuth support
- **Context-based State Management** - React Context for authentication

### ✅ User Interface
- **Material-UI Components** - Modern, responsive design
- **Form Validation** - Client-side validation with error handling
- **Loading States** - Progress indicators for async operations
- **Error Handling** - User-friendly error messages
- **Responsive Design** - Works on desktop and mobile

### ✅ OAuth Flows
- **Google OAuth** - Complete integration with Google Sign-In
- **Microsoft OAuth** - MSAL integration for Microsoft authentication
- **Tenant Registration** - Create organizations using OAuth
- **Tenant Login** - Domain-specific OAuth login

## Application Structure

```
frontend/src/
├── components/           # Reusable UI components
│   ├── GoogleOAuthButton.tsx
│   ├── MicrosoftOAuthButton.tsx
│   └── LoadingScreen.tsx
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication context
├── pages/               # Page components
│   ├── TenantRegister.tsx   # Organization registration
│   ├── TenantLogin.tsx      # Organization login
│   ├── Dashboard.tsx        # Main dashboard (existing)
│   └── NotFound.tsx         # 404 page
├── services/            # API services
│   └── authService.ts   # Authentication API calls
├── App.tsx             # Main app component
└── main.tsx            # App entry point
```

## Usage Guide

### 1. Tenant Registration Flow

1. **Visit Registration Page**: `http://localhost:3000/register`
2. **Fill Organization Details**:
   - Organization Name (e.g., "My Company")
   - Organization Domain (e.g., "mycompany")
3. **Fill Admin Details**:
   - Full Name
   - Email Address
   - Password
4. **Choose Registration Method**:
   - **Email/Password**: Click "Create Organization"
   - **OAuth**: Click "Create with Google" or "Create with Microsoft"

**Result**: New organization created, user becomes admin, redirected to dashboard.

### 2. Tenant Login Flow

1. **Visit Login Page**: `http://localhost:3000/login`
2. **Enter Organization Domain**: Type your organization's domain
3. **Click "Find Organization"**: System discovers your organization
4. **Choose Login Method**:
   - **OAuth**: Click "Continue with Google/Microsoft"
   - **Email/Password**: Enter credentials and click "Sign In"

**Result**: User authenticated to their specific organization.

### 3. Direct Domain Login

You can also go directly to: `http://localhost:3000/login/mycompany`

This will automatically discover the organization and show login options.

## OAuth Setup Instructions

### Google OAuth Setup

1. **Google Cloud Console**: https://console.cloud.google.com/
2. **Create Project** or select existing
3. **Enable Google+ API**
4. **Create OAuth 2.0 Client ID**:
   - Application type: Web application
   - Authorized origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
5. **Copy Client ID** to your `.env` file

### Microsoft OAuth Setup

1. **Azure Portal**: https://portal.azure.com/
2. **Go to Azure Active Directory** → App registrations
3. **New registration**:
   - Name: TeamHub Frontend
   - Redirect URI: `http://localhost:3000/auth/microsoft/callback`
4. **API permissions**: Add Microsoft Graph permissions:
   - `User.Read`
   - `email`
   - `profile`
5. **Copy Application (client) ID** to your `.env` file

## API Integration

The frontend integrates with these backend endpoints:

### Authentication Endpoints
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - General login
- `POST /api/auth/tenant/{domain}/login` - Tenant-specific login
- `GET /api/auth/tenant/{domain}` - Tenant discovery

### OAuth Endpoints
- `POST /api/auth/google` - Google OAuth registration/login
- `POST /api/auth/microsoft` - Microsoft OAuth registration/login
- `POST /api/auth/tenant/{domain}/google` - Google tenant login
- `POST /api/auth/tenant/{domain}/microsoft` - Microsoft tenant login

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

All environment variables must be prefixed with `VITE_` for Vite to include them:

```bash
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id
```

### Error Handling

The app includes comprehensive error handling:

- **Form Validation**: Client-side validation with field-level errors
- **API Errors**: Server errors displayed with user-friendly messages
- **OAuth Errors**: Specific handling for OAuth provider errors
- **Network Errors**: Graceful handling of network failures

### Security Features

- **Token Management**: Secure JWT token storage and automatic inclusion in requests
- **Auto-logout**: Automatic logout on token expiration
- **Input Validation**: Client-side validation for all forms
- **HTTPS Ready**: Production build supports HTTPS

## Testing the Application

### 1. Test Tenant Registration

1. Start backend server (`npm run dev` in backend folder)
2. Start frontend server (`npm run dev` in frontend folder)
3. Visit `http://localhost:3000/register`
4. Fill in organization details
5. Try both email/password and OAuth registration

### 2. Test Tenant Login

1. Visit `http://localhost:3000/login`
2. Enter an existing organization domain
3. Try both OAuth and email/password login
4. Verify user is redirected to dashboard

### 3. Test Error Handling

1. Try registering with existing domain
2. Try login with wrong credentials
3. Try accessing protected routes without authentication

## Troubleshooting

### Common Issues

1. **OAuth buttons not working**:
   - Check OAuth client IDs in `.env`
   - Verify redirect URIs in OAuth provider settings
   - Check browser console for errors

2. **API calls failing**:
   - Verify backend is running on port 5000
   - Check `VITE_API_URL` in `.env`
   - Check network tab in browser dev tools

3. **Build errors**:
   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript errors with `npm run lint`

### Debug Mode

Enable debug logging by adding to `.env`:
```bash
VITE_DEBUG=true
```

## Next Steps

1. ✅ Set up your OAuth providers
2. ✅ Configure your `.env` file
3. ✅ Test tenant registration flow
4. ✅ Test tenant login flow
5. ✅ Integrate with your backend API
6. 🔄 Implement additional features as needed

## Production Deployment

For production deployment:

1. **Build the app**: `npm run build`
2. **Set production environment variables**
3. **Deploy to your hosting platform**
4. **Update OAuth redirect URIs** to your production domain

The built files will be in the `dist` directory and can be served by any static hosting service.

---

**🎉 Your React frontend with OAuth authentication is ready!**

