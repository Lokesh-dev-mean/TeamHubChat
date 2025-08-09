const express = require('express');
const { query, param } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const filesController = require('../controllers/files.controller');
const { upload } = require('../config/storage');

/**
 * @swagger
 * components:
 *   schemas:
 *     MediaFile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         fileUrl:
 *           type: string
 *         fileType:
 *           type: string
 *         size:
 *           type: string
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *         uploadedBy:
 *           $ref: '#/components/schemas/User'
 *         downloadUrl:
 *           type: string
 *           format: uri
 */

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: Files to upload (max 10 files, 50MB each)
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     files:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MediaFile'
 *       400:
 *         description: No files uploaded or validation error
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 *       500:
 *         description: Server error
 */
router.post('/upload', auth, upload.array('files', 10), filesController.uploadFiles);

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: Get user's uploaded files
 *     tags: [Files]
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
 *         name: fileType
 *         schema:
 *           type: string
 *         description: Filter by file type (e.g., 'image', 'application')
 *     responses:
 *       200:
 *         description: Files retrieved successfully
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
 *                     files:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MediaFile'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', auth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('fileType')
    .optional()
    .isString()
    .withMessage('File type must be a string')
], filesController.getUserFiles);

/**
 * @swagger
 * /api/files/search:
 *   get:
 *     summary: Search files
 *     tags: [Files]
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
 *         name: fileType
 *         schema:
 *           type: string
 *         description: Filter by file type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter files uploaded after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter files uploaded before this date
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
 *       400:
 *         description: Invalid search query
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/search', auth, [
  query('query')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters long'),
  query('fileType')
    .optional()
    .isString()
    .withMessage('File type must be a string'),
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
], filesController.searchFiles);

/**
 * @swagger
 * /api/files/download/{fileKey}:
 *   get:
 *     summary: Download a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *         description: File key (URL encoded)
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found or access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/download/:fileKey', auth, filesController.downloadFile);

/**
 * @swagger
 * /api/files/{fileId}:
 *   get:
 *     summary: Get file details
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File details retrieved successfully
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
 *                     file:
 *                       $ref: '#/components/schemas/MediaFile'
 *       404:
 *         description: File not found or access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:fileId', auth, [
  param('fileId')
    .isUUID()
    .withMessage('File ID must be a valid UUID')
], filesController.getFileDetails);

/**
 * @swagger
 * /api/files/{fileId}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found or access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/:fileId', auth, [
  param('fileId')
    .isUUID()
    .withMessage('File ID must be a valid UUID')
], filesController.deleteUserFile);

module.exports = router;
