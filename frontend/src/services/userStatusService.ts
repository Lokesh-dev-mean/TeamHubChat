import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Types for user status
export interface UserStatus {
  userId: string;
  displayName: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeenAt: string;
}

export interface OnlineUser {
  id: string;
  displayName: string;
  onlineStatus: 'online' | 'away' | 'busy' | 'offline';
  lastSeenAt: string;
}

export interface ConversationParticipant {
  userId: string;
  user: {
    id: string;
    displayName: string;
    onlineStatus: 'online' | 'away' | 'busy' | 'offline';
    lastSeenAt: string;
  };
}

class UserStatusService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get user's current status
   * @param userId - User ID
   * @returns Promise<UserStatus>
   */
  async getUserStatus(userId: string): Promise<UserStatus> {
    try {
      const response = await axios.get(`${API_BASE}/user-status/${userId}`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user status:', error);
      throw error;
    }
  }

  /**
   * Update user's status
   * @param userId - User ID
   * @param status - New status
   * @returns Promise<UserStatus>
   */
  async updateUserStatus(userId: string, status: 'online' | 'away' | 'busy' | 'offline'): Promise<UserStatus> {
    try {
      const response = await axios.put(
        `${API_BASE}/user-status/${userId}`,
        { status },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Get all online users in a tenant
   * @param tenantId - Tenant ID
   * @returns Promise<OnlineUser[]>
   */
  async getOnlineUsers(tenantId: string): Promise<OnlineUser[]> {
    try {
      const response = await axios.get(`${API_BASE}/user-status/online/${tenantId}`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching online users:', error);
      throw error;
    }
  }

  /**
   * Get users by status in a tenant
   * @param tenantId - Tenant ID
   * @param status - Status to filter by
   * @returns Promise<OnlineUser[]>
   */
  async getUsersByStatus(tenantId: string, status: 'online' | 'away' | 'busy' | 'offline'): Promise<OnlineUser[]> {
    try {
      const response = await axios.get(`${API_BASE}/user-status/status/${tenantId}/${status}`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching users by status:', error);
      throw error;
    }
  }

  /**
   * Get conversation participants with their statuses
   * @param conversationId - Conversation ID
   * @returns Promise<ConversationParticipant[]>
   */
  async getConversationParticipantsWithStatus(conversationId: string): Promise<ConversationParticipant[]> {
    try {
      const response = await axios.get(`${API_BASE}/user-status/conversation/${conversationId}/participants`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation participants with status:', error);
      throw error;
    }
  }

  /**
   * Get statuses for multiple users
   * @param userIds - Array of user IDs
   * @returns Promise<Record<string, UserStatus>>
   */
  async getMultipleUserStatuses(userIds: string[]): Promise<Record<string, UserStatus>> {
    try {
      const statuses: Record<string, UserStatus> = {};
      
      // Fetch statuses for all users in parallel
      const promises = userIds.map(async (userId) => {
        try {
          const status = await this.getUserStatus(userId);
          statuses[userId] = status;
        } catch (error) {
          console.error(`Error fetching status for user ${userId}:`, error);
          // Set default offline status for failed requests
          statuses[userId] = {
            userId,
            displayName: 'Unknown User',
            status: 'offline',
            lastSeenAt: new Date().toISOString(),
          };
        }
      });

      await Promise.all(promises);
      return statuses;
    } catch (error) {
      console.error('Error fetching multiple user statuses:', error);
      throw error;
    }
  }
}

export const userStatusService = new UserStatusService();
export default userStatusService;
