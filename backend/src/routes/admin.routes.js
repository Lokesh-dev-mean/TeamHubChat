const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const { requireAdmin, requireAdminOrModerator, requirePermission } = require('../middleware/rbac.middleware');
const adminController = require('../controllers/admin.controller');

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get tenant dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         activeUsers:
 *                           type: integer
 *                         totalConversations:
 *                           type: integer
 *                         totalMessages:
 *                           type: integer
 *                         totalFiles:
 *                           type: integer
 *                         storageUsed:
 *                           type: string
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                     userGrowth:
 *                       type: array
 *                       items:
 *                         type: object
 *       403:
 *         description: Insufficient permissions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/dashboard', auth, requireAdmin, adminController.getDashboardStats);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users in tenant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, moderator, member, guest]
 *         description: Filter by user role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/users', auth, requirePermission('user.read'), [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('role')
    .optional()
    .isIn(['admin', 'moderator', 'member', 'guest'])
    .withMessage('Role must be admin, moderator, member, or guest'),
  query('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isActive must be true or false'),
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, adminController.getAllUsers);

/**
 * @swagger
 * /api/admin/users/{userId}/role:
 *   put:
 *     summary: Update user role and permissions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, member, guest]
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 default: []
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Validation error or cannot change own role
 *       404:
 *         description: User not found
 *       403:
 *         description: Insufficient permissions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/users/:userId/role', auth, requireAdmin, [
  param('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('role')
    .isIn(['admin', 'moderator', 'member', 'guest'])
    .withMessage('Role must be admin, moderator, member, or guest'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
], adminController.updateUserRole);

/**
 * @swagger
 * /api/admin/users/{userId}/status:
 *   put:
 *     summary: Activate or deactivate user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Validation error or cannot deactivate own account
 *       404:
 *         description: User not found
 *       403:
 *         description: Insufficient permissions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/users/:userId/status', auth, requireAdmin, [
  param('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean')
], adminController.updateUserStatus);

/**
 * @swagger
 * /api/admin/invitations:
 *   post:
 *     summary: Send user invitation
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, member, guest]
 *                 default: member
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 default: []
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *       400:
 *         description: User already exists or pending invitation exists
 *       403:
 *         description: Insufficient permissions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/invitations', auth, requireAdmin, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['admin', 'moderator', 'member', 'guest'])
    .withMessage('Role must be admin, moderator, member, or guest'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
], adminController.sendInvitation);

/**
 * @swagger
 * /api/admin/invitations:
 *   get:
 *     summary: Get all invitations
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, expired, revoked]
 *         description: Filter by invitation status
 *     responses:
 *       200:
 *         description: Invitations retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/invitations', auth, requireAdminOrModerator, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'accepted', 'expired', 'revoked'])
    .withMessage('Status must be pending, accepted, expired, or revoked')
], adminController.getInvitations);

/**
 * @swagger
 * /api/admin/invitations/{invitationId}:
 *   delete:
 *     summary: Revoke invitation
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invitation revoked successfully
 *       404:
 *         description: Invitation not found or already processed
 *       403:
 *         description: Insufficient permissions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/invitations/:invitationId', auth, requireAdmin, [
  param('invitationId')
    .isUUID()
    .withMessage('Invitation ID must be a valid UUID')
], adminController.revokeInvitation);

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs before this date
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/audit-logs', auth, requireAdmin, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('action')
    .optional()
    .isString()
    .withMessage('Action must be a string'),
  query('userId')
    .optional()
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
], adminController.getAuditLogs);

module.exports = router;
