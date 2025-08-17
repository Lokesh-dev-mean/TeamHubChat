const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user with email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - displayName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: SecurePass123
 *               displayName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: John Doe
 *               tenantName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: My Organization
 *                 description: Optional - Creates new organization
 *               tenantDomain:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 pattern: '^[a-zA-Z0-9-]+$'
 *                 example: myorg
 *                 description: Optional - Organization domain
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('displayName')
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('tenantName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Organization name must be between 1 and 100 characters')
], authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], authController.login);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Authenticate with Google OAuth
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Google ID token from frontend
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyN...
 *               tenantName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: My Organization
 *                 description: Optional - Creates new organization
 *               tenantDomain:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 pattern: '^[a-zA-Z0-9-]+$'
 *                 example: myorg
 *                 description: Optional - Organization domain
 *     responses:
 *       200:
 *         description: Login successful (existing user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       201:
 *         description: User registered and logged in successfully (new user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid token or domain already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/google', [
  body('token')
    .notEmpty()
    .withMessage('Google token is required'),
  body('tenantName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Organization name must be between 1 and 100 characters')
], authController.googleAuth);

/**
 * @swagger
 * /api/auth/microsoft:
 *   post:
 *     summary: Authenticate with Microsoft OAuth
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Microsoft access token from frontend
 *                 example: EwAoA8l6BAAU7p9QDpi0...
 *               tenantName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: My Organization
 *                 description: Optional - Creates new organization
 *               tenantDomain:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 pattern: '^[a-zA-Z0-9-]+$'
 *                 example: myorg
 *                 description: Optional - Organization domain
 *     responses:
 *       200:
 *         description: Login successful (existing user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       201:
 *         description: User registered and logged in successfully (new user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid token or domain already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid Microsoft access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/microsoft', [
  body('accessToken')
    .notEmpty()
    .withMessage('Microsoft access token is required'),
  body('tenantName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Organization name must be between 1 and 100 characters'),

], authController.microsoftAuth);

 

/**
 * @swagger
 * /api/auth/google/exchange:
 *   post:
 *     summary: Exchange Google OAuth authorization code for tokens
 *     tags: [OAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Google OAuth authorization code
 *                 example: "4/0AX4XfWjE..."
 *     responses:
 *       200:
 *         description: Authorization code exchanged successfully
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
 *                   example: "Authorization code exchanged successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: Google access token
 *                     idToken:
 *                       type: string
 *                       description: Google ID token (JWT)
 *       400:
 *         description: Invalid authorization code
 *       500:
 *         description: Server error
 */
router.post('/google/exchange', [
  body('code')
    .notEmpty()
    .withMessage('Google authorization code is required')
], authController.googleExchangeCode);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: No token or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', auth, authController.getCurrentUser);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
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
 *                   example: Logout successful
 *       401:
 *         description: No token or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', auth, authController.logout);

/**
 * @swagger
 * /api/auth/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System is healthy
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
 *                   example: System is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', async (req, res) => {
  try {
    const { prisma } = require('../utils/prisma');
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      message: 'System is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'System is unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/auth/logout-test:
 *   post:
 *     summary: Test logout endpoint (no auth required)
 *     tags: [System]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to logout
 *     responses:
 *       200:
 *         description: Logout test completed
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
 *                   example: Logout test completed
 */
router.post('/logout-test', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }
    
    const { prisma } = require('../utils/prisma');
    await prisma.user.update({
      where: { id: userId },
      data: { 
        onlineStatus: 'offline',
        lastSeenAt: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Logout test completed',
      userId
    });
  } catch (error) {
    console.error('Logout test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Logout test failed',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/tenant/{domain}:
 *   get:
 *     summary: Discover tenant by domain
 *     tags: [Tenant Management]
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant domain
 *         example: myorg
 *     responses:
 *       200:
 *         description: Tenant found
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
 *                   example: Organization found
 *                 data:
 *                   type: object
 *                   properties:
 *                     tenant:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: uuid
 *                         name:
 *                           type: string
 *                           example: My Organization
 *                         domain:
 *                           type: string
 *                           example: myorg
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         settings:
 *                           type: object
 *                           properties:
 *                             allowGuestAccess:
 *                               type: boolean
 *                             requireInviteApproval:
 *                               type: boolean
 *       404:
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */


/**
 * @swagger
 * /api/auth/invitation/{inviteToken}:
 *   get:
 *     summary: Get invitation details
 *     tags: [Invitations]
 *     parameters:
 *       - in: path
 *         name: inviteToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token
 *         example: abc123def456
 *     responses:
 *       200:
 *         description: Invitation details retrieved
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
 *                   example: Invitation details retrieved
 *                 data:
 *                   type: object
 *                   properties:
 *                     invitation:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         status:
 *                           type: string
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                         isExpired:
 *                           type: boolean
 *                         isValid:
 *                           type: boolean
 *                         tenant:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             domain:
 *                               type: string
 *                         invitedBy:
 *                           type: object
 *                           properties:
 *                             displayName:
 *                               type: string
 *                             email:
 *                               type: string
 *       404:
 *         description: Invalid invitation token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/invitation/:inviteToken', authController.getInvitationDetails);

/**
 * @swagger
 * /api/auth/invitation/{inviteToken}/accept:
 *   post:
 *     summary: Accept invitation and join tenant
 *     tags: [Invitations]
 *     parameters:
 *       - in: path
 *         name: inviteToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token
 *         example: abc123def456
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - displayName
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: SecurePass123
 *               displayName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: Successfully joined organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid invitation or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Invalid invitation token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/invitation/:inviteToken/accept', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('displayName')
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters')
], authController.acceptInvitation);

/**
 * @swagger
 * /api/auth/tenant/{domain}/google:
 *   post:
 *     summary: Google OAuth login to specific tenant
 *     tags: [Tenant OAuth]
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant domain
 *         example: myorg
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Google ID token from frontend
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyN...
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: User not found in organization or account deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */


// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Auth route error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;
