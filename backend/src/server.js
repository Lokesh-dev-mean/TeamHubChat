const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config/environment');
const prisma = require('./utils/prisma');
const { specs, swaggerUi } = require('./config/swagger');
const { logger, requestLogger, errorLogger, errorHandler } = require('./middleware/logging.middleware');

// Create Express app
const app = express();
const server = http.createServer(app);

// Setup socket.io
const io = new Server(server, {
  cors: {
    origin: config.websocket.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: config.websocket.pingTimeout,
  pingInterval: config.websocket.pingInterval
});

// CORS configuration using environment settings
const corsOptions = {
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 
    'Authorization', 'Cache-Control', 'Pragma'
  ],
  exposedHeaders: ['Authorization'],
  maxAge: config.cors.maxAge,
  optionsSuccessStatus: 200
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// Logging middleware
app.use(requestLogger);

// Database connection is handled by Prisma client
// Prisma will connect automatically on first query
// or we can explicitly connect
prisma.$connect()
  .then(() => console.log('Connected to PostgreSQL with Prisma'))
  .catch(err => console.error('Prisma connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/messages', require('./routes/messages.routes'));
app.use('/api/files', require('./routes/files.routes'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TeamHub API Documentation'
}));

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: `${config.app.name} API is running`,
    documentation: config.swagger.path,
    version: config.app.version,
    environment: config.app.env
  });
});

// Health check endpoint
if (config.monitoring.healthCheck.enabled) {
  app.get(config.monitoring.healthCheck.path, (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: config.app.version,
      environment: config.app.env
    });
  });
}

// Make io available to routes
app.set('io', io);

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('No token provided'));
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        tenantId: true
      }
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user.id;
    socket.tenantId = user.tenantId;
    socket.user = user;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User ${socket.user.displayName} (${socket.userId}) connected`);
  // Join tenant room for org-wide events
  if (socket.tenantId) {
    socket.join(socket.tenantId);
    // Notify tenant room of activity (used for last active updates)
    io.to(socket.tenantId).emit('user-activity', {
      userId: socket.userId,
      lastActiveAt: new Date().toISOString()
    });
  }
  
  // Join conversation rooms that user is part of
  socket.on('join-conversations', async () => {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: { userId: socket.userId }
          },
          deletedAt: null
        },
        select: { id: true }
      });

      conversations.forEach(conv => {
        socket.join(conv.id);
      });

      console.log(`User ${socket.user.displayName} joined ${conversations.length} conversation rooms`);
    } catch (error) {
      console.error('Error joining conversations:', error);
    }
  });

  // Join specific conversation
  socket.on('join-conversation', async (conversationId) => {
    try {
      // Verify user is participant
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId: socket.userId
        }
      });

      if (participant) {
        socket.join(conversationId);
        console.log(`User ${socket.user.displayName} joined conversation: ${conversationId}`);
        
        // Notify others that user is online in this conversation
        socket.to(conversationId).emit('user-online', {
          userId: socket.userId,
          displayName: socket.user.displayName,
          conversationId
        });
      }
    } catch (error) {
      console.error('Error joining conversation:', error);
    }
  });

  // Leave conversation
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(conversationId);
    console.log(`User ${socket.user.displayName} left conversation: ${conversationId}`);
    
    // Notify others that user left
    socket.to(conversationId).emit('user-offline', {
      userId: socket.userId,
      conversationId
    });
  });

  // Handle typing indicators (already implemented in messages controller)
  // Real-time events are emitted from the controller

  // Handle message read status
  socket.on('mark-messages-read', async (data) => {
    try {
      const { conversationId, messageIds } = data;
      
      // Verify user is participant
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId: socket.userId
        }
      });

      if (participant && messageIds?.length > 0) {
        // In a real implementation, you'd have a MessageRead model
        // For now, just emit the read status
        socket.to(conversationId).emit('messages-read', {
          userId: socket.userId,
          conversationId,
          messageIds,
          readAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Handle user status updates
  socket.on('update-status', async (status) => {
    try {
      if (['online', 'away', 'busy', 'offline'].includes(status)) {
        // Update user status in database if you have that field
        // For now, just broadcast to all user's conversations
        const conversations = await prisma.conversation.findMany({
          where: {
            participants: {
              some: { userId: socket.userId }
            }
          },
          select: { id: true }
        });

        conversations.forEach(conv => {
          socket.to(conv.id).emit('user-status-changed', {
            userId: socket.userId,
            status,
            updatedAt: new Date()
          });
        });

        // Also broadcast org-wide last activity timestamp
        if (socket.tenantId) {
          io.to(socket.tenantId).emit('user-activity', {
            userId: socket.userId,
            lastActiveAt: new Date().toISOString(),
            status
          });
        }
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  });

  // Disconnect handler
  socket.on('disconnect', async () => {
    console.log(`User ${socket.user.displayName} disconnected`);
    
    try {
      // Notify all conversations that user is offline
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: { userId: socket.userId }
          }
        },
        select: { id: true }
      });

      conversations.forEach(conv => {
        socket.to(conv.id).emit('user-offline', {
          userId: socket.userId,
          conversationId: conv.id
        });
      });

      // Org-wide activity update
      if (socket.tenantId) {
        io.to(socket.tenantId).emit('user-activity', {
          userId: socket.userId,
          lastActiveAt: new Date().toISOString(),
          status: 'offline'
        });
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Error handling middleware (must be after routes and socket setup)
app.use(errorLogger);
app.use(errorHandler);

// Start server
server.listen(config.app.port, () => {
  console.log(`🚀 ${config.app.name} v${config.app.version}`);
  console.log(`📡 Server running on port ${config.app.port}`);
  console.log(`🌍 Environment: ${config.app.env}`);
  console.log(`📚 API Documentation: http://localhost:${config.app.port}${config.swagger.path}`);
  
  if (config.monitoring.healthCheck.enabled) {
    console.log(`💚 Health Check: http://localhost:${config.app.port}${config.monitoring.healthCheck.path}`);
  }
  
  // Log enabled features
  const enabledFeatures = Object.entries(config.features)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature);
  
  console.log(`✨ Enabled features: ${enabledFeatures.join(', ')}`);
  
  // Log OAuth providers
  const enabledOAuth = Object.entries(config.oauth)
    .filter(([, provider]) => provider.enabled)
    .map(([provider]) => provider);
  
  if (enabledOAuth.length > 0) {
    console.log(`🔐 OAuth providers: ${enabledOAuth.join(', ')}`);
  }
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('Disconnected from PostgreSQL');
});

module.exports = { app, server, io, prisma };
