import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Conversation {
  id: string;
  name: string;
  isGroup: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  messageText?: string;
  fileUrl?: string;
  messageType: 'text' | 'file';
  createdAt: string;
}

export async function listConversations(page = 1, limit = 50) {
  const res = await api.get('/messages/conversations', { params: { page, limit } });
  return res.data.data;
}

export async function createConversation(name: string, participantIds: string[], isGroup = true) {
  const res = await api.post('/messages/conversations', { name, participantIds, isGroup });
  return res.data.data;
}

export async function getMessages(conversationId: string, page = 1, limit = 50) {
  const res = await api.get(`/messages/conversations/${conversationId}/messages`, { params: { page, limit } });
  return res.data.data;
}

export async function sendMessage(conversationId: string, messageText: string) {
  console.log(`📤 Sending message to conversation ${conversationId}:`, messageText);
  
  // Add timeout to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const startTime = Date.now();
    const res = await api.post(
      `/messages/conversations/${conversationId}/messages`, 
      { messageText, messageType: 'text' },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Message sent successfully in ${responseTime}ms:`, res.data);
    return res.data.data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('❌ Message sending timed out');
      throw new Error('Message sending timed out. Please try again.');
    }
    
    if (error.response) {
      // Server responded with error status
      console.error('❌ Server error:', error.response.status, error.response.data);
      const errorMessage = error.response.data?.message || 'Failed to send message';
      throw new Error(errorMessage);
    } else if (error.request) {
      // Network error
      console.error('❌ Network error:', error.request);
      throw new Error('Network error. Please check your connection and try again.');
    } else {
      // Other error
      console.error('❌ Unexpected error:', error.message);
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }
}

export async function setTyping(conversationId: string, isTyping: boolean) {
  await api.post(`/messages/conversations/${conversationId}/typing`, { isTyping });
}

export async function sendSimpleMessage(conversationId: string, messageText: string) {
  // Use the simple endpoint that doesn't require vector operations
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for simple messages
  
  try {
    const res = await api.post(
      `/messages/conversations/${conversationId}/messages/simple`, 
      { messageText },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    return res.data.data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Simple message sending timed out. Please try again.');
    }
    throw error;
  }
}

export async function sendUltraFastMessage(conversationId: string, messageText: string, userId: string) {
  // Use the ultra-fast endpoint for maximum performance
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for ultra-fast messages
  
  try {
    const res = await api.post(
      `/messages/conversations/${conversationId}/messages/ultra-fast`, 
      { messageText, userId },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    return res.data.data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Ultra-fast message sending timed out. Please try again.');
    }
    throw error;
  }
}

export async function sendMockMessage(conversationId: string, messageText: string, userId: string) {
  // Use the mock endpoint for testing (no database operations)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for mock messages
  
  try {
    const res = await api.post(
      `/messages/conversations/${conversationId}/messages/mock`, 
      { messageText, userId },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    return res.data.data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Mock message sending timed out. Please try again.');
    }
    throw error;
  }
}


