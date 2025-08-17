const { prisma } = require('../utils/prisma');
const bcrypt = require('bcryptjs');

/**
 * User service using Prisma ORM
 * Provides user-related database operations
 */
class UserService {
  /**
   * Find user by ID
   * @param {string} id - User ID
   * @param {object} options - Query options
   * @returns {Promise<object|null>} User object or null
   */
  static async findById(id, options = {}) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          tenant: true,
          ...options.include
        }
      });
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @param {object} options - Query options
   * @returns {Promise<object|null>} User object or null
   */
  static async findByEmail(email, options = {}) {
    try {
      return await prisma.user.findUnique({
        where: { email },
        include: {
          tenant: true,
          ...options.include
        }
      });
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find all users with optional filtering
   * @param {object} filters - Query filters
   * @param {object} options - Query options
   * @returns {Promise<Array>} Array of users
   */
  static async findMany(filters = {}, options = {}) {
    try {
      return await prisma.user.findMany({
        where: filters,
        include: {
          tenant: true,
          ...options.include
        },
        orderBy: options.orderBy || { createdAt: 'desc' },
        take: options.limit,
        skip: options.offset
      });
    } catch (error) {
      console.error('Error finding users:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {object} userData - User data
   * @returns {Promise<object>} Created user
   */
  static async create(userData) {
    try {
      // Hash password if provided
      if (userData.password) {
        const saltRounds = 12;
        userData.passwordHash = await bcrypt.hash(userData.password, saltRounds);
        delete userData.password; // Remove plain password
      }

      return await prisma.user.create({
        data: userData,
        include: {
          tenant: true
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user by ID
   * @param {string} id - User ID
   * @param {object} updateData - Data to update
   * @returns {Promise<object>} Updated user
   */
  static async updateById(id, updateData) {
    try {
      // Hash password if being updated
      if (updateData.password) {
        const saltRounds = 12;
        updateData.passwordHash = await bcrypt.hash(updateData.password, saltRounds);
        delete updateData.password; // Remove plain password
      }

      return await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          tenant: true
        }
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user by ID
   * @param {string} id - User ID
   * @returns {Promise<object>} Deleted user
   */
  static async deleteById(id) {
    try {
      return await prisma.user.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Compare password with hashed password
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {Promise<boolean>} True if passwords match
   */
  static async comparePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error comparing passwords:', error);
      throw error;
    }
  }

  /**
   * Get users by tenant ID
   * @param {string} tenantId - Tenant ID
   * @param {object} options - Query options
   * @returns {Promise<Array>} Array of users in tenant
   */
  static async findByTenantId(tenantId, options = {}) {
    try {
      return await prisma.user.findMany({
        where: { tenantId },
        include: {
          tenant: true,
          ...options.include
        },
        orderBy: options.orderBy || { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error finding users by tenant:', error);
      throw error;
    }
  }
}

module.exports = UserService;
