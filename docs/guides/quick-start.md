# Quick Start Guide

Get started with the TeamHub platform quickly by following this guide.

## Prerequisites

- Node.js 18+
- npm or yarn
- Git
- PostgreSQL 14+

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/teamhub-platform.git
   cd teamhub-platform
   ```

2. **Install Dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Backend environment
   cd backend
   cp .env.example .env

   # Frontend environment
   cd ../frontend
   cp .env.example .env
   ```

4. **Database Setup**
   ```bash
   # In backend directory
   npx prisma migrate dev
   ```

## Configuration

1. **Backend Environment Variables**
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/teamhub"

   # JWT
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=24h

   # Server
   PORT=5000
   NODE_ENV=development

   # OAuth (optional)
   GOOGLE_CLIENT_ID=your-client-id
   MICROSOFT_CLIENT_ID=your-client-id
   ```

2. **Frontend Environment Variables**
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_GOOGLE_CLIENT_ID=your-client-id
   VITE_MICROSOFT_CLIENT_ID=your-client-id
   ```

## Running the Application

1. **Start Backend**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - API Documentation: http://localhost:5000/api-docs

## Basic Usage

1. **Create Organization**
   - Visit http://localhost:3000/register
   - Fill in organization details
   - Choose authentication method

2. **Invite Users**
   - Login as admin
   - Go to User Management
   - Click "Invite Users"
   - Enter email addresses

3. **Access Control**
   - Manage roles in User Management
   - Configure permissions in Settings
   - Monitor access in Audit Logs

## Next Steps

- [Complete Setup Guide](complete-setup.md) - Detailed setup instructions
- [OAuth Setup Guide](oauth-setup.md) - Configure OAuth providers
- [API Documentation](../backend/api.md) - API reference
- [Frontend Guide](../frontend/setup.md) - Frontend development guide

## Troubleshooting

### Common Issues

1. **Database Connection**
   ```bash
   # Check database status
   npx prisma db seed
   ```

2. **OAuth Configuration**
   ```bash
   # Verify OAuth setup
   npm run verify:oauth
   ```

3. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -ano | findstr :5000
   netstat -ano | findstr :3000
   ```

For more detailed guides and documentation, visit the [Documentation Index](../README.md).

