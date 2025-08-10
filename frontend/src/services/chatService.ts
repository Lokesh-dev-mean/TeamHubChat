import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: API_BASE, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
  const res = await api.post(`/messages/conversations/${conversationId}/messages`, { messageText, messageType: 'text' });
  return res.data.data;
}

export async function setTyping(conversationId: string, isTyping: boolean) {
  await api.post(`/messages/conversations/${conversationId}/typing`, { isTyping });
}


