const express = require('express');
const router = express.Router();
const userStatusService = require('../services/userStatus.service');
const { auth: authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

/**
 * @swagger
 * /api/user-status/{userId}:
 *   get:
 *     summary: Get user's current status
 *     tags: [User Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 displayName:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [online, away, busy, offline]
 *                 lastSeenAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await userStatusService.getUserStatus(userId);
    res.json(status);
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/user-status/{userId}:
 *   put:
 *     summary: Update user's status
 *     tags: [User Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [online, away, busy, offline]
 *                 description: New status for the user
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 displayName:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [online, away, busy, offline]
 *                 lastSeenAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid status
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/:userId', authenticateToken, validateRequest, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    // Only allow users to update their own status
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'You can only update your own status' });
    }
    
    const updatedStatus = await userStatusService.updateUserStatus(userId, status);
    res.json(updatedStatus);
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('Invalid status')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/user-status/online/{tenantId}:
 *   get:
 *     summary: Get all online users in a tenant
 *     tags: [User Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     responses:
 *       200:
 *         description: Online users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   displayName:
 *                     type: string
 *                   onlineStatus:
 *                     type: string
 *                   lastSeenAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/online/:tenantId', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Verify user belongs to the tenant
    if (req.user.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to this tenant' });
    }
    
    const onlineUsers = await userStatusService.getOnlineUsers(tenantId);
    res.json(onlineUsers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/user-status/status/{tenantId}/{status}:
 *   get:
 *     summary: Get users by status in a tenant
 *     tags: [User Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [online, away, busy, offline]
 *         description: Status to filter by
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   displayName:
 *                     type: string
 *                   onlineStatus:
 *                     type: string
 *                   lastSeenAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Invalid status
 *       500:
 *         description: Internal server error
 */
router.get('/status/:tenantId/:status', authenticateToken, async (req, res) => {
  try {
    const { tenantId, status } = req.params;
    
    // Verify user belongs to the tenant
    if (req.user.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to this tenant' });
    }
    
    const validStatuses = ['online', 'away', 'busy', 'offline'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const users = await userStatusService.getUsersByStatus(tenantId, status);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/user-status/conversation/{conversationId}/participants:
 *   get:
 *     summary: Get conversation participants with their statuses
 *     tags: [User Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Participants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                   user:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       displayName:
 *                         type: string
 *                       onlineStatus:
 *                         type: string
 *                       lastSeenAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/conversation/:conversationId/participants', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // TODO: Verify user is participant in this conversation
    const participants = await userStatusService.getConversationParticipantsWithStatus(conversationId);
    res.json(participants);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
