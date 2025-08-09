const express = require('express');
const { query } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const searchController = require('../controllers/search.controller');

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Global search across messages, users, and files
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (minimum 2 characters)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, messages, users, files]
 *           default: all
 *         description: Type of content to search
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter results after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter results before this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                     type:
 *                       type: string
 *                     results:
 *                       type: object
 *                       properties:
 *                         messages:
 *                           type: object
 *                           properties:
 *                             data:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/Message'
 *                             count:
 *                               type: integer
 *                         users:
 *                           type: object
 *                           properties:
 *                             data:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/User'
 *                             count:
 *                               type: integer
 *                         files:
 *                           type: object
 *                           properties:
 *                             data:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/MediaFile'
 *                             count:
 *                               type: integer
 *                     totalResults:
 *                       type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 *       400:
 *         description: Invalid search query
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', auth, [
  query('query')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters long'),
  query('type')
    .optional()
    .isIn(['all', 'messages', 'users', 'files'])
    .withMessage('Type must be one of: all, messages, users, files'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], searchController.globalSearch);

/**
 * @swagger
 * /api/search/messages:
 *   get:
 *     summary: Advanced message search with filters
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query for message text
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific conversation
 *       - in: query
 *         name: senderId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by message sender
 *       - in: query
 *         name: messageType
 *         schema:
 *           type: string
 *           enum: [text, file]
 *         description: Filter by message type
 *       - in: query
 *         name: hasFile
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter messages with/without files
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter messages after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter messages before this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Message search results
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/messages', auth, [
  query('query')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters long'),
  query('conversationId')
    .optional()
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID'),
  query('senderId')
    .optional()
    .isUUID()
    .withMessage('Sender ID must be a valid UUID'),
  query('messageType')
    .optional()
    .isIn(['text', 'file'])
    .withMessage('Message type must be text or file'),
  query('hasFile')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('hasFile must be true or false'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], searchController.searchMessages);

/**
 * @swagger
 * /api/search/users:
 *   get:
 *     summary: Search users in the tenant
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query for user name or email
 *       - in: query
 *         name: excludeSelf
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: true
 *         description: Exclude current user from results
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: User search results
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/users', auth, [
  query('query')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters long'),
  query('excludeSelf')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('excludeSelf must be true or false'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], searchController.searchUsers);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Partial search query
 *     responses:
 *       200:
 *         description: Search suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [conversation, user]
 *                           id:
 *                             type: string
 *                           text:
 *                             type: string
 *                           subtitle:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/suggestions', auth, [
  query('query')
    .optional()
    .isString()
    .withMessage('Query must be a string')
], searchController.getSearchSuggestions);

module.exports = router;
