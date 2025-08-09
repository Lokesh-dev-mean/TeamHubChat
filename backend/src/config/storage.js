const multer = require('multer');
const path = require('path');
const mime = require('mime-types');
const config = require('./environment');

// File filter function
const fileFilter = (req, file, cb) => {
  if (config.storage.allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Generate unique filename
const generateFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalName);
  return `${timestamp}-${randomString}${extension}`;
};



// Local storage configuration
const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantId = req.tenantId || 'default';
    const uploadPath = path.join(process.cwd(), config.storage.uploadDir, tenantId);
    
    // Create directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const fileName = generateFileName(file.originalname);
    cb(null, fileName);
  }
});

// Use local storage by default (free option)
const storage = localStorage;

// Create multer upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.storage.maxFileSize,
    files: config.storage.maxFilesPerRequest
  }
});

// Generate signed URL for private files
const generateSignedUrl = async (fileKey, expiresIn = 3600) => {
  // For local storage, return the file path
  return `/api/files/download/${encodeURIComponent(fileKey)}`;
};

// Delete file from storage
const deleteFile = async (fileKey) => {
  // For local storage, delete the file
  const fs = require('fs').promises;
  const filePath = path.join(process.cwd(), config.storage.uploadDir, fileKey);
  
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    return false; // File doesn't exist
  }
};

// Get file info
const getFileInfo = async (fileKey) => {
  // For local storage, get file stats
  const fs = require('fs').promises;
  const filePath = path.join(process.cwd(), config.storage.uploadDir, fileKey);
  
  try {
    const stats = await fs.stat(filePath);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    
    return {
      size: stats.size,
      lastModified: stats.mtime,
      contentType: contentType
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

module.exports = {
  upload,
  generateSignedUrl,
  deleteFile,
  getFileInfo,
  fileFilter
};
