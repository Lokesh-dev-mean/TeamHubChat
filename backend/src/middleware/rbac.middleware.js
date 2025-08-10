const prisma = require('../utils/prisma');
const { createError } = require('../utils/errors');

// Define default permissions for each role
const DEFAULT_ROLE_PERMISSIONS = {
  admin: [
    'user.create', 'user.read', 'user.update', 'user.delete', 'user.invite', 'user.manage_roles',
    'conversation.create', 'conversation.read', 'conversation.update', 'conversation.delete', 'conversation.manage',
    'message.create', 'message.read', 'message.update', 'message.delete',
    'file.upload', 'file.read', 'file.delete',
    'tenant.read', 'tenant.update', 'tenant.manage_settings',
    'audit.read'
  ],
  moderator: [
    'user.read', 'user.invite',
    'conversation.create', 'conversation.read', 'conversation.update', 'conversation.manage',
    'message.create', 'message.read', 'message.update', 'message.delete',
    'file.upload', 'file.read', 'file.delete',
    'tenant.read'
  ],
  member: [
    'user.read',
    'conversation.create', 'conversation.read', 'conversation.update',
    'message.create', 'message.read', 'message.update',
    'file.upload', 'file.read', 'file.delete',
    'tenant.read'
  ],
  guest: [
    'conversation.read',
    'message.read',
    'file.read'
  ]
};

/**
 * Check if user has specific permission
 * @param {string} userId - User ID
 * @param {string} permission - Permission to check
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} Whether user has permission
 */
const hasPermission = async (userId, permission, tenantId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true }
  });

  if (!user?.isActive) {
    return false;
  }

  return DEFAULT_ROLE_PERMISSIONS[user.role]?.includes(permission) || false;
};

/**
 * Check if user has any of the specified permissions
 * @param {string} userId - User ID
 * @param {string[]} permissions - Permissions to check
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} Whether user has any permission
 */
const hasAnyPermission = async (userId, permissions, tenantId) => {
  for (const permission of permissions) {
    if (await hasPermission(userId, permission, tenantId)) {
      return true;
    }
  }
  return false;
};

/**
 * Check if user has all specified permissions
 * @param {string} userId - User ID
 * @param {string[]} permissions - Permissions to check
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} Whether user has all permissions
 */
const hasAllPermissions = async (userId, permissions, tenantId) => {
  for (const permission of permissions) {
    if (!(await hasPermission(userId, permission, tenantId))) {
      return false;
    }
  }
  return true;
};

/**
 * Middleware to check if user has specific permission
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @param {object} options - Options for permission checking
 * @returns {Function} Express middleware function
 */
const requirePermission = (requiredPermissions, options = {}) => {
  return async (req, res, next) => {
    try {
      const { userId, tenantId } = req;
      const { requireAll = false } = options;

      if (!userId) {
        throw createError.authentication('Authentication required');
      }

      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      const hasAccess = requireAll
        ? await hasAllPermissions(userId, permissions, tenantId)
        : await hasAnyPermission(userId, permissions, tenantId);

      if (!hasAccess) {
        throw createError.authorization('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has specific role
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {Function} Express middleware function
 */
const requireRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      const { userId } = req;

      if (!userId) {
        throw createError.authentication('Authentication required');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isActive: true }
      });

      if (!user?.isActive) {
        throw createError.authorization('User not found or inactive');
      }

      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      
      if (!roles.includes(user.role)) {
        throw createError.authorization('Insufficient role permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Middleware to check if user is admin or moderator
 */
const requireAdminOrModerator = requireRole(['admin', 'moderator']);

module.exports = {
  requirePermission,
  requireRole,
  requireAdmin,
  requireAdminOrModerator,
};