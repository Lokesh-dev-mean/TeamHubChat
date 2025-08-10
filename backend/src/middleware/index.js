const { auth, validateToken } = require('./auth.middleware');
const { errorHandler, setupErrorHandling } = require('./error.middleware');
const { requestLogger, errorLogger } = require('./logging.middleware');
const { requirePermission, requireRole, requireAdmin } = require('./rbac.middleware');
const { validateRequest } = require('./validation.middleware');

module.exports = {
  // Authentication middleware
  auth,
  validateToken,

  // Error handling middleware
  errorHandler,
  setupErrorHandling,

  // Logging middleware
  requestLogger,
  errorLogger,

  // RBAC middleware
  requirePermission,
  requireRole,
  requireAdmin,

  // Validation middleware
  validateRequest,
};
