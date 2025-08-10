# Environment Configuration Guide

This guide explains how to configure environment variables for both the frontend and backend of the TeamHub platform.

## Table of Contents
1. [Overview](#overview)
2. [Backend Configuration](#backend-configuration)
3. [Frontend Configuration](#frontend-configuration)
4. [Environment-Specific Configuration](#environment-specific-configuration)
5. [Validation](#validation)
6. [Security Considerations](#security-considerations)

## Overview

The TeamHub platform uses environment variables for configuration management. These variables are loaded from `.env` files and validated at runtime to ensure proper configuration.

## Backend Configuration

### Environment Files

The backend supports different environment configurations:

```bash
backend/
  .env                # Default environment variables
  .env.development    # Development-specific variables
  .env.production     # Production-specific variables
  .env.test          # Test-specific variables
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection URL | `postgresql://user:pass@localhost:5432/db` |
| JWT_SECRET | Secret key for JWT signing | `your-secure-secret-key` |
| NODE_ENV | Environment name | `development`, `production`, `test` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| PORT | Server port | 5000 | `5000` |
| LOG_LEVEL | Logging level | `info` | `debug`, `info`, `warn`, `error` |
| CORS_ORIGINS | Allowed CORS origins | `http://localhost:3000` | `https://app.example.com` |
| JWT_EXPIRES_IN | JWT expiration time | `24h` | `7d`, `30d` |

### OAuth Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| GOOGLE_CLIENT_ID | Google OAuth client ID | Yes* |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret | Yes* |
| MICROSOFT_CLIENT_ID | Microsoft OAuth client ID | Yes* |
| MICROSOFT_CLIENT_SECRET | Microsoft OAuth client secret | Yes* |

*Required if OAuth is enabled

### Storage Configuration

| Variable | Description | Required in Production |
|----------|-------------|----------------------|
| STORAGE_PROVIDER | Storage provider type | Yes |
| AWS_S3_BUCKET | S3 bucket name | Yes |
| AWS_REGION | AWS region | Yes |

## Frontend Configuration

### Environment Files

The frontend uses Vite's environment variable system:

```bash
frontend/
  .env                # Default environment variables
  .env.development    # Development-specific variables
  .env.production     # Production-specific variables
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | `http://localhost:5000/api` |
| VITE_GOOGLE_CLIENT_ID | Google OAuth client ID | `your-client-id.apps.googleusercontent.com` |
| VITE_MICROSOFT_CLIENT_ID | Microsoft OAuth client ID | `your-azure-client-id` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| VITE_APP_NAME | Application name | TeamHub | `My TeamHub` |
| VITE_APP_VERSION | Application version | 1.0.0 | `1.2.3` |
| VITE_ENABLE_FILE_UPLOAD | Enable file uploads | true | `false` |
| VITE_MAX_FILE_SIZE | Maximum file size | 52428800 | `104857600` |
| VITE_PRIMARY_COLOR | Primary theme color | #1976d2 | `#ff0000` |
| VITE_SECONDARY_COLOR | Secondary theme color | #dc004e | `#00ff00` |

## Environment-Specific Configuration

### Development

```env
# Backend (.env.development)
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug
CORS_ORIGINS=http://localhost:3000

# Frontend (.env.development)
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME="TeamHub Dev"
VITE_MAX_FILE_SIZE=104857600
```

### Production

```env
# Backend (.env.production)
NODE_ENV=production
PORT=80
LOG_LEVEL=info
CORS_ORIGINS=https://app.example.com
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=my-teamhub-bucket
AWS_REGION=us-west-2

# Frontend (.env.production)
VITE_API_URL=https://api.example.com
VITE_APP_NAME="TeamHub"
VITE_ENABLE_FILE_UPLOAD=true
```

### Test

```env
# Backend (.env.test)
NODE_ENV=test
PORT=5001
LOG_LEVEL=error
DATABASE_URL=postgresql://localhost:5432/teamhub_test
```

## Validation

Both frontend and backend implement environment variable validation:

### Backend Validation

```javascript
// Validate environment variables
const config = require('./config');

// Variables are validated on server startup
if (!config.isValid) {
  console.error('Invalid configuration:', config.errors);
  process.exit(1);
}
```

### Frontend Validation

```typescript
// Initialize environment validation
import { initEnvValidation } from './config/validation';

// Validate environment variables before app starts
initEnvValidation();
```

## Security Considerations

1. **Secret Management**
   - Never commit `.env` files to version control
   - Use secure secret management in production
   - Rotate secrets regularly

2. **Access Control**
   - Limit access to environment variables
   - Use role-based access for cloud services
   - Audit environment access regularly

3. **Production Security**
   - Use SSL/TLS in production
   - Enable security headers
   - Implement rate limiting
   - Configure CORS properly

4. **Monitoring**
   - Log configuration changes
   - Monitor environment health
   - Set up alerts for critical issues

For more information about specific features, refer to:
- [OAuth Setup Guide](oauth-setup.md)
- [Quick Start Guide](quick-start.md)
- [Backend API Documentation](../backend/api.md)

