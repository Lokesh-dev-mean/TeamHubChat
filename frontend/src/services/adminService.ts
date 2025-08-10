import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface OrgUser {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'moderator' | 'member' | 'guest';
  isActive: boolean;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export async function fetchUsers(page = 1, limit = 20, search = '') {
  const res = await api.get('/admin/users', { params: { page, limit, search } });
  return res.data.data as { users: OrgUser[]; pagination: any };
}

export async function sendInvitation(email: string, role: string = 'member') {
  const res = await api.post('/admin/invitations', { email, role });
  return res.data.data.invitation as { inviteToken: string; inviteUrl: string; email: string };
}

export async function getInvitations(status?: string) {
  const res = await api.get('/admin/invitations', { params: { status } });
  return res.data.data;
}

export async function revokeInvitation(invitationId: string) {
  const res = await api.delete(`/admin/invitations/${invitationId}`);
  return res.data;
}

export async function updateUserRole(userId: string, role: OrgUser['role'], permissions: string[] = []) {
  const res = await api.put(`/admin/users/${userId}/role`, { role, permissions });
  return res.data.data.user as OrgUser;
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  const res = await api.put(`/admin/users/${userId}/status`, { isActive });
  return res.data.data?.user as OrgUser | undefined;
}

export async function updateMyProfile(userId: string, updates: Partial<Pick<OrgUser, 'displayName' | 'avatarUrl'>>) {
  const res = await api.put(`/users/${userId}`, updates);
  return res.data.data as OrgUser;
}


