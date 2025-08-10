const express = require('express');
const router = express.Router();
const UserService = require('../models/user.model');
const { auth } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users in tenant
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
router.get('/', auth, async (req, res) => {
  try {
    // Get users from the same tenant
    const filters = req.tenantId ? { tenantId: req.tenantId } : {};
    const users = await UserService.findMany(filters);
    
    // Remove password hashes from response
    const sanitizedUsers = users.map(user => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json({
      success: true,
      data: sanitizedUsers
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await UserService.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Check if user belongs to same tenant (unless admin)
    if (req.tenantId && user.tenantId !== req.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - user belongs to different organization'
      });
    }
    
    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 example: Updated Name
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/avatar.jpg
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is trying to update their own profile
    if (req.userId !== req.params.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this user profile' 
      });
    }
    
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.email;
    delete updates.password;
    delete updates.passwordHash;
    delete updates.tenantId;
    
    const user = await UserService.updateById(req.params.id, updates);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: 'User profile updated successfully',
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating user'
    });
  }
});

/**
 * @swagger
 * /api/users/status/{id}:
 *   put:
 *     summary: Update user status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *                 enum: [online, offline, away, busy]
 *                 example: online
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Status updated successfully
 */
router.put('/status/:id', auth, async (req, res) => {
  try {
    // Check if user is trying to update their own status
    if (req.userId !== req.params.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this user status' 
      });
    }
    
    const { status } = req.body;
    
    if (!['online', 'offline', 'away', 'busy'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status. Must be one of: online, offline, away, busy' 
      });
    }
    
    // Note: Status is not part of current Prisma schema, 
    // but keeping this endpoint for future implementation
    res.json({
      success: true,
      message: 'Status update feature will be implemented with real-time presence system'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating status'
    });
  }
});

module.exports = router;
