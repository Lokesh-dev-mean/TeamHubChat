const prisma = require('../utils/prisma');

// Define default permissions for each role
const DEFAULT_ROLE_PERMISSIONS = {
  admin: [
    'user.create',
    'user.read',
    'user.update',
    'user.delete',
    'user.invite',
    'user.manage_roles',
    'conversation.create',
    'conversation.read',
    'conversation.update',
    'conversation.delete',
    'conversation.manage',
    'message.create',
    'message.read',
    'message.update',
    'message.delete',
    'file.upload',
    'file.read',
    'file.delete',
    'tenant.read',
    'tenant.update',
    'tenant.manage_settings',
    'audit.read'
  ],
  moderator: [
    'user.read',
    'user.invite',
    'conversation.create',
    'conversation.read',
    'conversation.update',
    'conversation.manage',
    'message.create',
    'message.read',
    'message.update',
    'message.delete', // Can delete any message
    'file.upload',
    'file.read',
    'file.delete',
    'tenant.read'
  ],
  member: [
    'user.read',
    'conversation.create',
    'conversation.read',
    'conversation.update', // Only own conversations
    'message.create',
    'message.read',
    'message.update', // Only own messages
    'file.upload',
    'file.read',
    'file.delete', // Only own files
    'tenant.read'
  ],
  guest: [
    'conversation.read', // Limited conversations
    'message.read',
    'file.read' // Limited files
  ]
};

/**
 * Check if user has specific permission
 * @param {string} userId - User ID
 * @param {string} permission - Permission to check
 * @param {string} tenantId - Tenant ID
 * @returns {boolean} - Whether user has permission
 */
const hasPermission = async (userId, permission, tenantId = null) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return false;
    }

    // If tenant is specified, check if user belongs to that tenant
    if (tenantId && user.tenantId !== tenantId) {
      return false;
    }

    // Check user's direct permissions
    if (user.permissions.includes(permission)) {
      return true;
    }

    // Check user's role-based permissions
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    if (defaultPermissions.includes(permission)) {
      return true;
    }

    // Check permissions from assigned roles
    for (const roleAssignment of user.roleAssignments) {
      if (roleAssignment.role.permissions.includes(permission)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Check if user has any of the specified permissions
 * @param {string} userId - User ID
 * @param {string[]} permissions - Array of permissions to check
 * @param {string} tenantId - Tenant ID
 * @returns {boolean} - Whether user has any of the permissions
 */
const hasAnyPermission = async (userId, permissions, tenantId = null) => {
  for (const permission of permissions) {
    if (await hasPermission(userId, permission, tenantId)) {
      return true;
    }
  }
  return false;
};

/**
 * Check if user has all of the specified permissions
 * @param {string} userId - User ID
 * @param {string[]} permissions - Array of permissions to check
 * @param {string} tenantId - Tenant ID
 * @returns {boolean} - Whether user has all permissions
 */
const hasAllPermissions = async (userId, permissions, tenantId = null) => {
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
 * @returns {Function} - Express middleware function
 */
const requirePermission = (requiredPermissions, options = {}) => {
  return async (req, res, next) => {
    try {
      const { userId, tenantId } = req;
      const { requireAll = false } = options;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      let hasAccess;
      if (requireAll) {
        hasAccess = await hasAllPermissions(userId, permissions, tenantId);
      } else {
        hasAccess = await hasAnyPermission(userId, permissions, tenantId);
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during permission check'
      });
    }
  };
};

/**
 * Middleware to check if user has specific role
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {Function} - Express middleware function
 */
const requireRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      const { userId } = req;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isActive: true }
      });

      if (!user || !user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'User not found or inactive'
        });
      }

      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      
      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient role permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during role check'
      });
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

/**
 * Get user's effective permissions
 * @param {string} userId - User ID
 * @returns {string[]} - Array of permissions
 */
const getUserPermissions = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return [];
    }

    const permissions = new Set();

    // Add direct permissions
    user.permissions.forEach(permission => permissions.add(permission));

    // Add role-based permissions
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    defaultPermissions.forEach(permission => permissions.add(permission));

    // Add permissions from assigned roles
    user.roleAssignments.forEach(roleAssignment => {
      roleAssignment.role.permissions.forEach(permission => permissions.add(permission));
    });

    return Array.from(permissions);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
};

/**
 * Check if user can perform action on resource
 * @param {string} userId - User ID
 * @param {string} action - Action to perform
 * @param {string} resourceType - Type of resource
 * @param {object} resource - Resource object (optional)
 * @returns {boolean} - Whether user can perform action
 */
const canPerformAction = async (userId, action, resourceType, resource = null) => {
  const permission = `${resourceType}.${action}`;
  
  // Check basic permission
  if (!(await hasPermission(userId, permission))) {
    return false;
  }

  // Additional checks for specific resources
  if (resource) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, tenantId: true }
    });

    // Check if it's the user's own resource (for update/delete operations)
    if (['update', 'delete'].includes(action)) {
      // For messages, files, etc. - users can only modify their own
      if (resource.uploadedById === userId || resource.senderId === userId) {
        return true;
      }
      
      // Admins and moderators can modify any resource
      if (['admin', 'moderator'].includes(user.role)) {
        return true;
      }
      
      return false;
    }

    // Check tenant access
    if (resource.tenantId && resource.tenantId !== user.tenantId) {
      return false;
    }
  }

  return true;
};

module.exports = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  requireRole,
  requireAdmin,
  requireAdminOrModerator,
  getUserPermissions,
  canPerformAction,
  DEFAULT_ROLE_PERMISSIONS
};
