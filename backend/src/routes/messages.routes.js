const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const messagesController = require('../controllers/messages.controller');

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
