# TeamHub Communication Platform

A modern, multi-tenant communication platform built with React, Node.js, and Material-UI. Features real-time messaging, OAuth authentication, file sharing, and comprehensive admin controls.

![TeamHub Platform](https://img.shields.io/badge/Platform-TeamHub-blue)
![React](https://img.shields.io/badge/Frontend-React%2018-61dafb)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933)
![Material-UI](https://img.shields.io/badge/UI-Material--UI-0081cb)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791)

## 🚀 Features

### ✨ **Core Features**
- **Multi-Tenant Architecture** - Isolated workspaces for organizations
- **Real-Time Messaging** - WebSocket-powered chat with Socket.IO
- **OAuth Authentication** - Google, Microsoft, and GitHub integration
- **File Sharing** - Local file storage with comprehensive management
- **Role-Based Access Control (RBAC)** - Admin, user, and guest roles
- **Tenant Discovery** - Find organizations by domain
- **Audit Logging** - Complete activity tracking

### 🎨 **Frontend Features**
- **Modern React UI** - Built with Material-UI components
- **Responsive Design** - Works on desktop and mobile
- **Real-Time Updates** - Live chat and notifications
- **OAuth Integration** - Seamless third-party authentication
- **Form Validation** - Client-side validation with error handling
- **Loading States** - Progressive loading indicators

### 🔧 **Backend Features**
- **RESTful API** - Comprehensive API with Swagger documentation
- **WebSocket Support** - Real-time bidirectional communication
- **Database ORM** - Prisma with PostgreSQL/SQLite support
- **File Management** - Upload, download, and delete operations
- **Search System** - Global search across messages, users, and files
- **Admin Dashboard** - Complete tenant management

## 🏗️ **Architecture**

```
teamhub-platform/
├── frontend/                 # React + Material-UI Frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React contexts (Auth)
│   │   ├── pages/          # Application pages
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
│
├── backend/                 # Node.js + Express Backend
│   ├── src/
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Authentication & RBAC
│   │   ├── routes/         # API routes
│   │   ├── config/         # Configuration files
│   │   └── utils/          # Utility functions
│   └── prisma/             # Database schema & migrations
│
└── database/               # Database configuration
```

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL (or SQLite for development)

### 1. Clone Repository
```bash
git clone https://github.com/Lokesh-dev-mean/TeamHubChat.git
cd TeamHubChat
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npx prisma migrate deploy
npx prisma generate

# Start backend server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Start frontend server
npm run dev
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs

## 🔧 **Configuration**

### Backend Environment Variables
```bash
# Application
NODE_ENV=development
PORT=5000
APP_NAME="TeamHub Communication Platform"

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/teamhub"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN="http://localhost:3000"
FRONTEND_URL=http://localhost:3000

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# File Storage
STORAGE_TYPE=local
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800
```

### Frontend Environment Variables
```bash
# Backend API
VITE_API_URL=http://localhost:5000/api

# OAuth Client IDs
VITE_GOOGLE_CLIENT_ID="your-google-client-id"
VITE_MICROSOFT_CLIENT_ID="your-microsoft-client-id"
```

## 📖 **Usage Guide**

### Creating an Organization
1. Visit http://localhost:3000/register
2. Fill in organization details (name, domain)
3. Fill in admin user details
4. Choose registration method:
   - Email/Password registration
   - OAuth with Google/Microsoft

### Joining an Organization
1. Visit http://localhost:3000/login
2. Enter organization domain
3. System discovers organization
4. Login with credentials or OAuth

### OAuth Setup
1. **Google OAuth**: Get credentials from [Google Cloud Console](https://console.cloud.google.com/)
2. **Microsoft OAuth**: Get credentials from [Azure Portal](https://portal.azure.com/)
3. **GitHub OAuth**: Get credentials from [GitHub Developer Settings](https://github.com/settings/developers)

## 🔐 **Security Features**

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **CORS Protection** - Configured for frontend domain
- **Input Validation** - Server-side validation with express-validator
- **SQL Injection Protection** - Prisma ORM prevents SQL injection
- **Environment Variables** - Sensitive data in environment files
- **Rate Limiting** - API rate limiting (configurable)

## 📊 **API Documentation**

The backend provides comprehensive API documentation via Swagger UI:
- **URL**: http://localhost:5000/api-docs
- **Format**: OpenAPI 3.0
- **Features**: Interactive testing, request/response examples

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/microsoft` - Microsoft OAuth
- `POST /api/auth/github` - GitHub OAuth

#### Tenant Management
- `GET /api/auth/tenant/:domain` - Tenant discovery
- `POST /api/auth/tenant/:domain/login` - Tenant-specific login

#### Messages
- `GET /api/messages` - Get conversations
- `POST /api/messages` - Send message
- `PUT /api/messages/:id/read` - Mark as read

#### File Management
- `POST /api/files/upload` - Upload files
- `GET /api/files/download/:fileKey` - Download files
- `DELETE /api/files/:fileId` - Delete files

## 🧪 **Testing**

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

### API Testing
- Import Postman collection from `backend/postman/`
- Use Swagger UI at http://localhost:5000/api-docs

## 🚀 **Deployment**

### Backend Deployment
1. Set production environment variables
2. Build application: `npm run build`
3. Start production server: `npm start`

### Frontend Deployment
1. Set production API URL in `.env`
2. Build application: `npm run build`
3. Serve static files from `dist/` directory

### Database Migration
```bash
npx prisma migrate deploy
npx prisma generate
```

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

### Documentation
- [Backend Setup Guide](backend/QUICK_START_GUIDE.md)
- [Frontend Setup Guide](frontend/FRONTEND_SETUP_GUIDE.md)
- [OAuth Configuration](backend/OAUTH_SETUP_GUIDE.md)
- [Tenant Flow Guide](backend/TENANT_FLOW_GUIDE.md)

### Troubleshooting
- **Database Connection**: Check DATABASE_URL in `.env`
- **CORS Issues**: Verify CORS_ORIGIN matches frontend URL
- **OAuth Errors**: Check client IDs and secrets
- **Port Conflicts**: Ensure ports 3000 and 5000 are available

### Common Issues
1. **OAuth buttons disabled**: Fill in organization details first
2. **API calls failing**: Check if backend server is running
3. **Build errors**: Run `npm install` and check dependencies

## 🎯 **Roadmap**

- [ ] Mobile application (React Native)
- [ ] Video calling integration
- [ ] Advanced search filters
- [ ] Message encryption
- [ ] Push notifications
- [ ] Emoji reactions
- [ ] Thread conversations
- [ ] File preview
- [ ] Dark mode theme
- [ ] Multi-language support

---

**Built with ❤️ by the TeamHub Team**

For more information, visit our [documentation](backend/API_TESTING_GUIDE.md) or [contact us](mailto:support@teamhub.dev).