const prisma = require('../utils/prisma');
const { generateSignedUrl, deleteFile, getFileInfo } = require('../config/storage');
const path = require('path');
const fs = require('fs').promises;

/**
 * Upload files
 * @route POST /api/files/upload
 * @access Private
 */
const uploadFiles = async (req, res) => {
  try {
    const { userId, tenantId } = req;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = [];

    // Process each uploaded file
    for (const file of files) {
      const fileKey = path.relative(path.join(process.cwd(), 'uploads'), file.path);
      const fileSize = file.size;

      // Save file metadata to database
      const mediaFile = await prisma.mediaFile.create({
        data: {
          uploadedById: userId,
          tenantId,
          fileUrl: fileKey,
          fileType: file.mimetype,
          size: BigInt(fileSize)
        }
      });

      uploadedFiles.push({
        id: mediaFile.id,
        originalName: file.originalname,
        filename: file.filename,
        fileKey: fileKey,
        fileType: file.mimetype,
        size: fileSize,
        downloadUrl: await generateSignedUrl(fileKey)
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'FILES_UPLOADED',
        targetId: uploadedFiles[0].id,
        context: `Uploaded ${uploadedFiles.length} file(s)`
      }
    });

    res.status(201).json({
      success: true,
      message: 'Files uploaded successfully',
      data: { files: uploadedFiles }
    });

  } catch (error) {
    console.error('Upload files error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading files'
    });
  }
};

/**
 * Get user's uploaded files
 * @route GET /api/files
 * @access Private
 */
const getUserFiles = async (req, res) => {
  try {
    const { userId, tenantId } = req;
    const { page = 1, limit = 20, fileType } = req.query;

    const skip = (page - 1) * limit;

    const whereClause = {
      uploadedById: userId,
      tenantId
    };

    // Filter by file type if provided
    if (fileType) {
      whereClause.fileType = {
        startsWith: fileType
      };
    }

    const files = await prisma.mediaFile.findMany({
      where: whereClause,
      include: {
        uploadedBy: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    // Generate download URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => ({
        ...file,
        size: file.size.toString(), // Convert BigInt to string for JSON
        downloadUrl: await generateSignedUrl(file.fileUrl)
      }))
    );

    res.json({
      success: true,
      data: {
        files: filesWithUrls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: files.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user files error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching files'
    });
  }
};

/**
 * Download/serve file
 * @route GET /api/files/download/:fileKey
 * @access Private
 */
const downloadFile = async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { userId, tenantId } = req;
    
    // Decode the file key
    const decodedFileKey = decodeURIComponent(fileKey);

    // Check if user has access to this file
    const mediaFile = await prisma.mediaFile.findFirst({
      where: {
        fileUrl: decodedFileKey,
        OR: [
          { uploadedById: userId }, // User uploaded the file
          { tenantId } // File belongs to user's tenant
        ]
      }
    });

    if (!mediaFile) {
      return res.status(404).json({
        success: false,
        message: 'File not found or access denied'
      });
    }

    const filePath = path.join(process.cwd(), 'uploads', decodedFileKey);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    // Get file info
    const fileInfo = await getFileInfo(decodedFileKey);
    
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Set appropriate headers
    res.set({
      'Content-Type': fileInfo.contentType,
      'Content-Length': fileInfo.size,
      'Cache-Control': 'private, max-age=3600' // Cache for 1 hour
    });

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while downloading file'
    });
  }
};

/**
 * Delete file
 * @route DELETE /api/files/:fileId
 * @access Private
 */
const deleteUserFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, tenantId } = req;

    // Check if file exists and user has permission to delete
    const mediaFile = await prisma.mediaFile.findFirst({
      where: {
        id: fileId,
        uploadedById: userId,
        tenantId
      }
    });

    if (!mediaFile) {
      return res.status(404).json({
        success: false,
        message: 'File not found or access denied'
      });
    }

    // Delete file from storage
    try {
      await deleteFile(mediaFile.fileUrl);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete file record from database
    await prisma.mediaFile.delete({
      where: { id: fileId }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'FILE_DELETED',
        targetId: fileId,
        context: `Deleted file: ${mediaFile.fileUrl}`
      }
    });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting file'
    });
  }
};

/**
 * Get file details
 * @route GET /api/files/:fileId
 * @access Private
 */
const getFileDetails = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, tenantId } = req;

    // Check if user has access to this file
    const mediaFile = await prisma.mediaFile.findFirst({
      where: {
        id: fileId,
        OR: [
          { uploadedById: userId }, // User uploaded the file
          { tenantId } // File belongs to user's tenant
        ]
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      }
    });

    if (!mediaFile) {
      return res.status(404).json({
        success: false,
        message: 'File not found or access denied'
      });
    }

    // Get additional file info from storage
    const fileInfo = await getFileInfo(mediaFile.fileUrl);

    const fileDetails = {
      ...mediaFile,
      size: mediaFile.size.toString(), // Convert BigInt to string
      downloadUrl: await generateSignedUrl(mediaFile.fileUrl),
      storageInfo: fileInfo
    };

    res.json({
      success: true,
      data: { file: fileDetails }
    });

  } catch (error) {
    console.error('Get file details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching file details'
    });
  }
};

/**
 * Search files
 * @route GET /api/files/search
 * @access Private
 */
const searchFiles = async (req, res) => {
  try {
    const { userId, tenantId } = req;
    const { query, fileType, startDate, endDate, page = 1, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const skip = (page - 1) * limit;

    const whereClause = {
      tenantId,
      fileUrl: {
        contains: query,
        mode: 'insensitive'
      }
    };

    // Filter by file type if provided
    if (fileType) {
      whereClause.fileType = {
        startsWith: fileType
      };
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      whereClause.uploadedAt = {};
      if (startDate) {
        whereClause.uploadedAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.uploadedAt.lte = new Date(endDate);
      }
    }

    const files = await prisma.mediaFile.findMany({
      where: whereClause,
      include: {
        uploadedBy: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    // Generate download URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => ({
        ...file,
        size: file.size.toString(), // Convert BigInt to string for JSON
        downloadUrl: await generateSignedUrl(file.fileUrl)
      }))
    );

    res.json({
      success: true,
      data: {
        files: filesWithUrls,
        query,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: files.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Search files error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching files'
    });
  }
};

module.exports = {
  uploadFiles,
  getUserFiles,
  downloadFile,
  deleteUserFile,
  getFileDetails,
  searchFiles
};
