const { prisma } = require('../utils/prisma');

class UserStatusService {
  /**
   * Get user's current status
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User status object
   */
  async getUserStatus(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          displayName: true,
          onlineStatus: true,
          lastSeenAt: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        userId: user.id,
        displayName: user.displayName,
        status: user.onlineStatus,
        lastSeenAt: user.lastSeenAt
      };
    } catch (error) {
      console.error('Error getting user status:', error);
      throw error;
    }
  }

  /**
   * Update user's status
   * @param {string} userId - User ID
   * @param {string} status - New status (online, away, busy, offline)
   * @returns {Promise<Object>} Updated user status
   */
  async updateUserStatus(userId, status) {
    try {
      const validStatuses = ['online', 'away', 'busy', 'offline'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status. Must be one of: online, away, busy, offline');
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          onlineStatus: status,
          lastSeenAt: new Date()
        },
        select: {
          id: true,
          displayName: true,
          onlineStatus: true,
          lastSeenAt: true
        }
      });

      return {
        userId: user.id,
        displayName: user.displayName,
        status: user.onlineStatus,
        lastSeenAt: user.lastSeenAt
      };
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Get all online users in a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Array of online users
   */
  async getOnlineUsers(tenantId) {
    try {
      const onlineUsers = await prisma.user.findMany({
        where: {
          tenantId,
          onlineStatus: 'online',
          isActive: true,
          deletedAt: null
        },
        select: {
          id: true,
          displayName: true,
          onlineStatus: true,
          lastSeenAt: true
        }
      });

      return onlineUsers;
    } catch (error) {
      console.error('Error getting online users:', error);
      throw error;
    }
  }

  /**
   * Get users by status in a tenant
   * @param {string} tenantId - Tenant ID
   * @param {string} status - Status to filter by
   * @returns {Promise<Array>} Array of users with specified status
   */
  async getUsersByStatus(tenantId, status) {
    try {
      const users = await prisma.user.findMany({
        where: {
          tenantId,
          onlineStatus: status,
          isActive: true,
          deletedAt: null
        },
        select: {
          id: true,
          displayName: true,
          onlineStatus: true,
          lastSeenAt: true
        }
      });

      return users;
    } catch (error) {
      console.error('Error getting users by status:', error);
      throw error;
    }
  }

  /**
   * Update user's last seen timestamp
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async updateLastSeen(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastSeenAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating last seen:', error);
      throw error;
    }
  }

  /**
   * Get user's conversation participants with their statuses
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Array>} Array of participants with statuses
   */
  async getConversationParticipantsWithStatus(conversationId) {
    try {
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              onlineStatus: true,
              lastSeenAt: true
            }
          }
        }
      });

      return participants.map(p => ({
        userId: p.userId,
        user: p.user
      }));
    } catch (error) {
      console.error('Error getting conversation participants with status:', error);
      throw error;
    }
  }
}

module.exports = new UserStatusService();
