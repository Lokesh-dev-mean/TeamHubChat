const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const messagesController = require('../controllers/messages.controller');
const { prisma } = require('../utils/prisma');

/**
 * @swagger
 * /api/messages/ping:
 *   get:
 *     summary: Simple ping endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Pong response
 */
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/messages/health:
 *   get:
 *     summary: Messages service health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Messages service is healthy
 */
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('🔍 Messages service health check started');
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log(`✅ Database connection test completed in ${Date.now() - startTime}ms`);
    
    // Test basic message query
    const messageCount = await prisma.message.count();
    console.log(`✅ Message count query completed in ${Date.now() - startTime}ms`);
    
    // Test conversation query
    const conversationCount = await prisma.conversation.count();
    console.log(`✅ Conversation count query completed in ${Date.now() - startTime}ms`);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Health check completed in ${totalTime}ms`);
    
    res.json({
      success: true,
      message: 'Messages service is healthy',
      database: 'connected',
      messageCount,
      conversationCount,
      performance: { totalTime },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Messages service health check failed after ${totalTime}ms:`, error);
    res.status(500).json({
      success: false,
      message: 'Messages service is unhealthy',
      error: error.message,
      performance: { totalTime },
      timestamp: new Date().toISOString()
    });
  }
});

// Conversation routes
router.post('/conversations', auth, [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Conversation name must be between 1 and 100 characters'),
  body('participantIds')
    .isArray({ min: 1 })
    .withMessage('At least one participant is required'),
  body('participantIds.*')
    .isUUID()
    .withMessage('Each participant ID must be a valid UUID'),
  body('isGroup')
    .optional()
    .isBoolean()
    .withMessage('isGroup must be a boolean'),
  body('crossTenant')
    .optional()
    .isBoolean()
    .withMessage('crossTenant must be a boolean')
], messagesController.createConversation);

router.get('/conversations', auth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], messagesController.getConversations);

router.get('/conversations/:conversationId/messages', auth, [
  param('conversationId')
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], messagesController.getMessages);

router.post('/conversations/:conversationId/messages', auth, [
  param('conversationId')
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID'),
  body('messageText')
    .optional()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message text must be between 1 and 2000 characters'),
  body('fileUrl')
    .optional()
    .isURL()
    .withMessage('File URL must be a valid URL'),
  body('messageType')
    .optional()
    .isIn(['text', 'file'])
    .withMessage('Message type must be either text or file')
], messagesController.sendMessage);

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/messages/simple:
 *   post:
 *     summary: Send a simple message without vector operations
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageText:
 *                 type: string
 *                 description: Message text
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post('/conversations/:conversationId/messages/simple', auth, async (req, res) => {
  const startTime = Date.now();
  console.log(`🚀 Simple message request started for conversation: ${req.params.conversationId}`);
  
  try {
    const { conversationId } = req.params;
    const { messageText } = req.body;
    const { userId, tenantId } = req;

    // Validate input
    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    // Check if user is participant in conversation (quick check)
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId
      },
      select: { id: true } // Only select what we need
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages to this conversation'
      });
    }

    console.log(`✅ Authorization check completed in ${Date.now() - startTime}ms`);

    // Create message with minimal data and no complex operations - add timeout
    const messagePromise = prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        messageText: messageText.trim(),
        messageType: 'text'
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        messageText: true,
        messageType: true,
        createdAt: true
      }
    });

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timeout')), 5000);
    });

    const message = await Promise.race([messagePromise, timeoutPromise]);

    console.log(`✅ Message created in ${Date.now() - startTime}ms`);

    // Mark as read by sender (async, don't wait)
    prisma.messageRead.create({
      data: {
        messageId: message.id,
        userId
      }
    }).catch(error => {
      console.error('Failed to mark message as read:', error);
    });

    // Update conversation timestamp (async, don't wait)
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    }).catch(error => {
      console.error('Failed to update conversation timestamp:', error);
    });

    const totalTime = Date.now() - startTime;
    console.log(`✅ Simple message sent successfully in ${totalTime}ms`);

    res.status(201).json({
      success: true,
      message: 'Simple message sent successfully',
      data: { message },
      performance: { totalTime }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Simple message error after ${totalTime}ms:`, error);
    
    if (error.message === 'Database operation timeout') {
      return res.status(408).json({
        success: false,
        message: 'Database operation timed out. Please try again.',
        error: 'TIMEOUT',
        performance: { totalTime }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while sending simple message',
      error: error.message,
      performance: { totalTime }
    });
  }
});

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/messages/ultra-fast:
 *   post:
 *     summary: Ultra-fast message endpoint for testing (no auth required)
 *     tags: [System]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageText:
 *                 type: string
 *                 description: Message text
 *               userId:
 *                 type: string
 *                 description: User ID (for testing)
 *     responses:
 *       201:
 *         description: Ultra-fast message sent successfully
 */
router.post('/conversations/:conversationId/messages/ultra-fast', async (req, res) => {
  const startTime = Date.now();
  console.log(`⚡ Ultra-fast message request started for conversation: ${req.params.conversationId}`);
  
  try {
    const { conversationId } = req.params;
    const { messageText, userId } = req.body;

    // Validate input
    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required for testing'
      });
    }

    console.log(`✅ Input validation completed in ${Date.now() - startTime}ms`);

    // Create message with absolute minimal operations - add timeout
    const messagePromise = prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        messageText: messageText.trim(),
        messageType: 'text'
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        messageText: true,
        createdAt: true
      }
    });

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timeout')), 3000);
    });

    const message = await Promise.race([messagePromise, timeoutPromise]);

    const totalTime = Date.now() - startTime;
    console.log(`⚡ Ultra-fast message sent successfully in ${totalTime}ms`);

    res.status(201).json({
      success: true,
      message: 'Ultra-fast message sent successfully',
      data: { message },
      performance: { totalTime }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Ultra-fast message error after ${totalTime}ms:`, error);
    
    if (error.message === 'Database operation timeout') {
      return res.status(408).json({
        success: false,
        message: 'Database operation timed out. Please try again.',
        error: 'TIMEOUT',
        performance: { totalTime }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while sending ultra-fast message',
      error: error.message,
      performance: { totalTime }
    });
  }
});

/**
 * @swagger
 * /api/messages/performance-test:
 *   get:
 *     summary: Test database performance
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Performance test results
 */
router.get('/performance-test', async (req, res) => {
  const startTime = Date.now();
  console.log('🚀 Database performance test started');
  
  try {
    const results = {};
    
    // Test 1: Simple SELECT 1
    const test1Start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    results.select1 = Date.now() - test1Start;
    
    // Test 2: Count messages (with timeout)
    const test2Start = Date.now();
    const messageCountPromise = prisma.message.count();
    const messageCountTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Message count timeout')), 5000);
    });
    const messageCount = await Promise.race([messageCountPromise, messageCountTimeout]);
    results.messageCount = Date.now() - test2Start;
    
    // Test 3: Count conversations (with timeout)
    const test3Start = Date.now();
    const conversationCountPromise = prisma.conversation.count();
    const conversationCountTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Conversation count timeout')), 5000);
    });
    const conversationCount = await Promise.race([conversationCountPromise, conversationCountTimeout]);
    results.conversationCount = Date.now() - test3Start;
    
    // Test 4: Simple message creation (without saving)
    const test4Start = Date.now();
    const testMessage = {
      conversationId: 'test',
      senderId: 'test',
      messageText: 'test',
      messageType: 'text'
    };
    results.messageCreation = Date.now() - test4Start;
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Performance test completed in ${totalTime}ms`);
    
    res.json({
      success: true,
      message: 'Performance test completed',
      results: {
        ...results,
        totalTime,
        messageCount,
        conversationCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Performance test failed after ${totalTime}ms:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Performance test failed',
      error: error.message,
      performance: { totalTime },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/messages/mock:
 *   post:
 *     summary: Mock message endpoint (no database operations)
 *     tags: [System]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageText:
 *                 type: string
 *                 description: Message text
 *               userId:
 *                 type: string
 *                 description: User ID
 *     responses:
 *       201:
 *         description: Mock message created successfully
 */
router.post('/conversations/:conversationId/messages/mock', async (req, res) => {
  const startTime = Date.now();
  console.log(`🎭 Mock message request started for conversation: ${req.params.conversationId}`);
  
  try {
    const { conversationId } = req.params;
    const { messageText, userId } = req.body;

    // Validate input
    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    console.log(`✅ Input validation completed in ${Date.now() - startTime}ms`);

    // Simulate processing time (100ms)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create mock message without database
    const mockMessage = {
      id: `mock-${Date.now()}`,
      conversationId,
      senderId: userId,
      messageText: messageText.trim(),
      messageType: 'text',
      createdAt: new Date().toISOString()
    };

    const totalTime = Date.now() - startTime;
    console.log(`🎭 Mock message created successfully in ${totalTime}ms`);

    res.status(201).json({
      success: true,
      message: 'Mock message created successfully',
      data: { message: mockMessage },
      performance: { totalTime },
      note: 'This is a mock message - no database operations performed'
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Mock message error after ${totalTime}ms:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating mock message',
      error: error.message,
      performance: { totalTime }
    });
  }
});

router.post('/conversations/:conversationId/typing', auth, [
  param('conversationId')
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID'),
  body('isTyping')
    .isBoolean()
    .withMessage('isTyping must be a boolean')
], messagesController.setTyping);

// Message routes
router.put('/:messageId', auth, [
  param('messageId')
    .isUUID()
    .withMessage('Message ID must be a valid UUID'),
  body('messageText')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message text must be between 1 and 2000 characters')
], messagesController.editMessage);

router.delete('/:messageId', auth, [
  param('messageId')
    .isUUID()
    .withMessage('Message ID must be a valid UUID')
], messagesController.deleteMessage);

router.post('/:messageId/reactions', auth, [
  param('messageId')
    .isUUID()
    .withMessage('Message ID must be a valid UUID'),
  body('emoji')
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji must be between 1 and 10 characters')
], messagesController.addReaction);

module.exports = router;
