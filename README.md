# TeamHub Communication Platform

A comprehensive multi-tenant communication platform built with Node.js, React, and PostgreSQL. Features real-time messaging, file sharing, advanced search, role-based access control, and admin dashboard.

## 🚀 Features

### 🔐 Authentication & Security
- **Multi-Provider OAuth**: Google, Microsoft, GitHub integration
- **Email/Password Authentication** with secure password hashing
- **JWT-based Authentication** with 7-day token expiration
- **Role-Based Access Control (RBAC)** with 4 roles and 20+ permissions
- **Multi-tenant Architecture** with complete data isolation

### 💬 Real-Time Communication
- **WebSocket-based Real-time Messaging** using Socket.IO
- **1:1 and Group Conversations** with unlimited participants
- **Message Reactions** with emoji support
- **Typing Indicators** and **User Presence** (online/offline)
- **Message Read Receipts** and editing capabilities
- **Cross-tenant Conversations** for inter-organization communication

### 📁 File Management
- **Free Local File Storage** (no cloud costs!)
- **Multiple File Type Support**: Images, documents, media files
- **File Size Limits**: 50MB per file, 10 files per upload
- **Secure File Access** with permission-based downloads
- **File Search and Filtering** by type, date, and name

### 🔍 Advanced Search System
- **Global Search** across messages, users, and files
- **Advanced Filters**: Date range, file type, sender, conversation
- **Search Suggestions** for improved user experience
- **Real-time Search Results** with pagination

### 👨‍💼 Admin Dashboard
- **Comprehensive Analytics**: User stats, message counts, storage usage
- **User Management**: Role assignment, activation/deactivation
- **Invitation System** with secure token-based invites
- **Audit Logging** for all system activities
- **Tenant Settings** and configuration management

## 🏗️ Architecture

### Backend Stack
- **Node.js** with Express.js framework
- **PostgreSQL** database with Prisma ORM
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **Multer** for file uploads
- **Express Validator** for input validation
- **Swagger** for API documentation

### Database Models
- **14 Prisma Models** with proper relationships
- **UUID Primary Keys** for enhanced security
- **Soft Deletes** for data retention
- **Audit Trail** for all operations
- **Multi-tenant Data Isolation**

### Security Features
- **bcrypt Password Hashing** (12 rounds)
- **Permission-based Middleware**
- **Tenant Data Isolation**
- **File Access Control**
- **Input Validation & Sanitization**

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn** package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd teamhub-platform
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Environment Configuration

⚠️ **IMPORTANT**: Never commit `.env` files to version control! They contain sensitive credentials.

#### Quick Setup (Recommended)
Copy the template and customize:
```bash
cd backend

# Copy template to create your .env file
cp env.template .env

# Edit .env with your REAL credentials (this file will not be committed)
nano .env  # or use your preferred editor
```

#### Complete Environment Configuration
For advanced configuration, copy the comprehensive template:
```bash
cd backend
cp config.env.example .env
# Edit .env with all available options
```

#### Minimal .env file:
```env
# Required Settings
DATABASE_URL="postgresql://username:password@localhost:5432/teamhub"
JWT_SECRET="your-super-secret-jwt-key-here-make-it-very-long-and-random"

# Application Settings
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### 4. Database Setup
```bash
# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# (Optional) View database in Prisma Studio
npx prisma studio
```

### 5. Start the Backend Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The backend server will start on `http://localhost:5000`

### 6. Frontend Setup (if available)
```bash
cd frontend
npm install
npm run dev
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Interactive API Documentation
Visit `http://localhost:5000/api-docs` for complete Swagger documentation.

### Main Endpoints

#### Authentication
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/google` - Google OAuth authentication
- `POST /api/auth/microsoft` - Microsoft OAuth authentication
- `POST /api/auth/github` - GitHub OAuth authentication
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user

#### Messages & Conversations
- `POST /api/messages/conversations` - Create conversation
- `GET /api/messages/conversations` - Get user's conversations
- `GET /api/messages/conversations/:id/messages` - Get conversation messages
- `POST /api/messages/conversations/:id/messages` - Send message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/:id/reactions` - Add/remove reaction

#### File Management
- `POST /api/files/upload` - Upload files (multipart/form-data)
- `GET /api/files` - Get user's files
- `GET /api/files/:id` - Get file details
- `GET /api/files/download/:key` - Download file
- `DELETE /api/files/:id` - Delete file
- `GET /api/files/search` - Search files

#### Search
- `GET /api/search` - Global search (messages, users, files)
- `GET /api/search/messages` - Advanced message search
- `GET /api/search/users` - Search users
- `GET /api/search/suggestions` - Get search suggestions

#### Admin (Admin role required)
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/role` - Update user role
- `PUT /api/admin/users/:id/status` - Activate/deactivate user
- `POST /api/admin/invitations` - Send invitation
- `GET /api/admin/invitations` - Get invitations
- `DELETE /api/admin/invitations/:id` - Revoke invitation
- `GET /api/admin/audit-logs` - Get audit logs

## 🔐 User Roles & Permissions

### Roles
- **Admin**: Full system access, user management, tenant settings
- **Moderator**: User management, content moderation, advanced features
- **Member**: Standard user with conversation and file access
- **Guest**: Limited read-only access to specific conversations

### Key Permissions
- `user.create`, `user.read`, `user.update`, `user.delete`
- `conversation.create`, `conversation.read`, `conversation.manage`
- `message.create`, `message.read`, `message.update`, `message.delete`
- `file.upload`, `file.read`, `file.delete`
- `tenant.read`, `tenant.update`, `tenant.manage_settings`
- `audit.read`

## 🔄 Real-Time Events

### WebSocket Events
Connect to WebSocket with JWT token in auth header or handshake auth.

#### Client → Server
- `join-conversations` - Join all user's conversation rooms
- `join-conversation` - Join specific conversation
- `leave-conversation` - Leave conversation
- `mark-messages-read` - Mark messages as read
- `update-status` - Update user status (online/away/busy/offline)

#### Server → Client
- `new-message` - New message received
- `message-updated` - Message was edited
- `message-deleted` - Message was deleted
- `reaction-added` - Reaction added to message
- `reaction-removed` - Reaction removed from message
- `typing-indicator` - User typing status changed
- `user-online` - User came online
- `user-offline` - User went offline
- `messages-read` - Messages marked as read

## 📁 File Storage

Files are stored locally in the `backend/uploads` directory with the following structure:
```
uploads/
  ├── {tenantId}/
  │   └── {userId}/
  │       ├── timestamp-random.ext
  │       └── ...
  └── default/
```

### Supported File Types
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Documents**: PDF, Word, Excel, PowerPoint
- **Text**: Plain text, CSV
- **Archives**: ZIP, RAR, 7Z
- **Media**: MP3, WAV, MP4, MPEG

## ⚙️ Configuration Options

The platform supports extensive configuration through environment variables. All settings are centralized in `backend/src/config/environment.js`.

### Configuration Categories

#### 🔐 **Authentication & Security**
- JWT token settings (secret, expiration)
- Password hashing rounds
- OAuth provider credentials
- Session management
- CORS configuration

#### 📁 **File Storage**
- Upload directory and size limits
- Allowed file types
- S3 configuration (optional)
- File access permissions

#### 🌐 **Network & Performance**
- Server port and CORS origins
- Rate limiting settings
- WebSocket configuration
- Database connection pooling

#### 📊 **Monitoring & Logging**
- Log levels and file rotation
- Health check endpoints
- Analytics and metrics
- Error tracking integration

#### 🎛️ **Feature Flags**
Enable/disable specific features:
- Cross-tenant messaging
- File sharing capabilities
- Message reactions and typing indicators
- User presence and audit logging
- Advanced search and admin dashboard

#### 🏢 **Tenant Management**
- Default user limits per tenant
- Storage quotas and retention policies
- Invitation settings and expiration
- Guest access permissions

### Environment Templates

- **`env.template`** - Quick setup with minimal configuration
- **`config.env.example`** - Complete configuration with all options
- Both files include detailed comments explaining each setting

## 🔍 Search Capabilities

### Global Search
Search across all content types with a single query:
```javascript
GET /api/search?query=project&type=all&startDate=2024-01-01
```

### Advanced Message Search
```javascript
GET /api/search/messages?query=meeting&conversationId=123&senderId=456&hasFile=true
```

### File Search with Filters
```javascript
GET /api/files/search?query=report&fileType=application&startDate=2024-01-01
```

## 🛠️ Development

### Database Migrations
```bash
# Create new migration
npx prisma migrate dev --name your_migration_name

# Reset database (development only)
npx prisma migrate reset

# Deploy migrations (production)
npx prisma migrate deploy
```

### Code Structure
```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models (legacy)
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── prisma/
│   ├── migrations/      # Database migrations
│   └── schema.prisma    # Database schema
├── uploads/             # File storage
└── test/                # Test files
```

## 📊 Performance & Scaling

### Current Capabilities
- **Real-time messaging** under 300ms delivery
- **File uploads** up to 50MB per file
- **Concurrent users** optimized for Teams-level usage
- **Database indexing** on frequently queried fields

### Scaling Recommendations
- **Redis** for session storage and WebSocket scaling
- **CDN** for file delivery
- **Database read replicas** for search operations
- **Load balancer** for multiple server instances

## 🔒 Security Considerations

### Implemented Security
- **Password hashing** with bcrypt (12 rounds)
- **JWT tokens** with expiration
- **Input validation** on all endpoints
- **SQL injection prevention** via Prisma
- **File type validation** and size limits
- **CORS configuration** for frontend access

### Production Security Checklist
- [ ] Use HTTPS in production
- [ ] Set secure JWT secrets (256-bit minimum)
- [ ] Configure CORS for specific domains
- [ ] Set up rate limiting
- [ ] Enable database SSL
- [ ] Configure file upload limits
- [ ] Set up monitoring and logging

### 🔒 Environment File Security

**CRITICAL**: Never commit `.env` files to version control!

#### What's Safe to Commit:
✅ `env.template` - Template with placeholder values  
✅ `config.env.example` - Complete configuration template  
✅ `.gitignore` - Ensures .env files are ignored  

#### What Should NEVER be Committed:
❌ `.env` - Contains real secrets and credentials  
❌ `.env.local` - Local development overrides  
❌ `.env.production` - Production secrets  

#### Template vs Real Files:
```bash
# Template files (safe to commit)
env.template                 # Quick setup template
config.env.example          # Complete configuration template

# Real files (NEVER commit)
.env                        # Your actual environment variables
.env.local                  # Local overrides
.env.production            # Production configuration
```

## 🚀 Deployment

### Environment Variables (Production)
```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
JWT_SECRET="your-production-jwt-secret"
PORT=5000
```

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 5000
CMD ["npm", "start"]
```

## 📈 Monitoring & Analytics

### Available Metrics
- **User activity** (registrations, logins, active users)
- **Message statistics** (sent, received, reactions)
- **File usage** (uploads, downloads, storage consumption)
- **System performance** (response times, error rates)

### Audit Logging
All significant actions are logged:
- User authentication events
- Role and permission changes
- Message and file operations
- Admin actions and configuration changes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Database Connection Error**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify connection string in .env
DATABASE_URL="postgresql://username:password@localhost:5432/teamhub"
```

**File Upload Issues**
```bash
# Check uploads directory exists and is writable
mkdir -p backend/uploads/default
chmod 755 backend/uploads
```

**WebSocket Connection Failed**
- Ensure frontend connects to correct WebSocket URL
- Check CORS configuration in server.js
- Verify JWT token is passed in connection headers

### Getting Help
- Check the [API documentation](http://localhost:5000/api-docs)
- Review the [issues](https://github.com/your-repo/issues) page
- Join our [community discussions](https://github.com/your-repo/discussions)

## 🎯 Roadmap

### Upcoming Features
- [ ] **Push Notifications** (web and mobile)
- [ ] **Video/Voice Calling** integration
- [ ] **Message Threading** for organized discussions
- [ ] **Custom Emoji** and reactions
- [ ] **Advanced File Preview** (PDF, images in chat)
- [ ] **Message Scheduling** and reminders
- [ ] **Integration APIs** for third-party services
- [ ] **Mobile Apps** (React Native)

### Performance Enhancements
- [ ] **Redis Caching** for frequently accessed data
- [ ] **Database Query Optimization**
- [ ] **CDN Integration** for file delivery
- [ ] **WebSocket Clustering** for horizontal scaling

---

## 🌟 Acknowledgments

Built with modern technologies and best practices:
- [Node.js](https://nodejs.org/) - Runtime environment
- [Express.js](https://expressjs.com/) - Web framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Socket.IO](https://socket.io/) - Real-time communication
- [PostgreSQL](https://www.postgresql.org/) - Database
- [JWT](https://jwt.io/) - Authentication tokens

**TeamHub Platform** - Connecting teams, empowering collaboration! 🚀