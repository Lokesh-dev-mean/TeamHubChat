# TeamHub Authentication API Testing Guide

## 🚀 Quick Start

### 1. Start the Server
```bash
cd backend
npm install
npm run dev
```

### 2. Access Documentation
- **Swagger UI**: http://localhost:5000/api-docs
- **API Base URL**: http://localhost:5000

## 📋 API Endpoints Overview

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register with email | No |
| POST | `/api/auth/login` | Login with email | No |
| POST | `/api/auth/google` | Google OAuth login | No |
| POST | `/api/auth/microsoft` | Microsoft OAuth login | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/logout` | Logout user | Yes |

## 🧪 Testing with Postman

### Import Collection & Environment

1. **Import Collection**: 
   - File: `postman/TeamHub_Auth_API.postman_collection.json`

2. **Import Environment**: 
   - File: `postman/TeamHub_Development.postman_environment.json`

3. **Set Environment Variables**:
   - `base_url`: http://localhost:5000
   - `user_email`: Your test email
   - `user_password`: Your test password

### Test Scenarios

#### 1. Email Registration & Login Flow
```bash
# 1. Register new user
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "SecurePass123",
  "displayName": "Test User",
  "tenantName": "Test Organization",
  "tenantDomain": "test-org"
}

# 2. Login with credentials
POST /api/auth/login
{
  "email": "test@example.com",
  "password": "SecurePass123"
}

# 3. Get current user (use token from login)
GET /api/auth/me
Authorization: Bearer <token>

# 4. Logout
POST /api/auth/logout
Authorization: Bearer <token>
```

#### 2. Google OAuth Flow
```bash
# Google OAuth login/register
POST /api/auth/google
{
  "token": "GOOGLE_ID_TOKEN_FROM_FRONTEND",
  "tenantName": "Google Organization",
  "tenantDomain": "google-org"
}
```

#### 3. Microsoft OAuth Flow
```bash
# Microsoft OAuth login/register
POST /api/auth/microsoft
{
  "accessToken": "MICROSOFT_ACCESS_TOKEN_FROM_FRONTEND",
  "tenantName": "Microsoft Organization", 
  "tenantDomain": "microsoft-org"
}
```

## 🔧 Manual Testing with cURL

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "displayName": "Test User",
    "tenantName": "Test Organization",
    "tenantDomain": "test-org"
  }'
```

### Login User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 Expected Response Formats

### Successful Authentication Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "User Name",
      "avatarUrl": null,
      "tenantId": "uuid",
      "tenant": {
        "id": "uuid",
        "name": "Organization Name",
        "domain": "org-domain",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt.token.here"
  }
}
```

### Error Response
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

## 🧪 Automated Testing

### Run Test Suite
```bash
# Run all authentication tests
npm test

# Run specific test file
npm test -- --grep "Authentication"
```

### Test Coverage Areas

1. **Input Validation**
   - Email format validation
   - Password strength requirements
   - Required field validation

2. **Authentication Flow**
   - User registration
   - User login
   - Token generation and validation
   - Protected route access

3. **OAuth Integration**
   - Google OAuth token verification
   - Microsoft OAuth token verification
   - User creation from OAuth data

4. **Error Handling**
   - Invalid credentials
   - Duplicate user registration
   - Missing authentication tokens
   - Expired tokens

5. **Multi-tenant Support**
   - Tenant creation during registration
   - User-tenant association
   - Tenant isolation

## 🔍 Debugging Tips

### Common Issues

1. **Database Connection**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Run Prisma migrations: `npx prisma migrate dev`

2. **OAuth Tokens**
   - Google tokens expire quickly (use fresh tokens)
   - Microsoft tokens need proper scopes
   - Verify OAuth client credentials in .env

3. **CORS Issues**
   - Check frontend URL in CORS configuration
   - Verify request headers

### Logging
- Check server console for detailed error messages
- Enable debug logging in development
- Review audit logs in database

## 📈 Performance Testing

### Load Testing with Artillery
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run load-test-config.yml
```

### Metrics to Monitor
- Response time for authentication endpoints
- Token generation time
- Database query performance
- Memory usage during OAuth flows

## 🔐 Security Testing

### Security Checklist
- [ ] Password hashing with bcrypt
- [ ] JWT token expiration
- [ ] Input sanitization
- [ ] Rate limiting (future implementation)
- [ ] HTTPS in production
- [ ] Secure headers
- [ ] OAuth token validation

### Penetration Testing
- Test for SQL injection
- Test for XSS vulnerabilities
- Test authentication bypass attempts
- Verify token tampering protection

## 📝 Documentation

### Swagger/OpenAPI
- Interactive documentation: http://localhost:5000/api-docs
- Export OpenAPI spec for external tools
- Test endpoints directly from Swagger UI

### Postman Documentation
- Generate documentation from Postman collection
- Share collection with team members
- Keep examples up to date

## 🚀 Deployment Testing

### Environment-Specific Testing
1. **Development**: Local testing with test database
2. **Staging**: Full integration testing
3. **Production**: Smoke tests only

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] OAuth credentials updated
- [ ] CORS settings configured
- [ ] SSL certificates installed
