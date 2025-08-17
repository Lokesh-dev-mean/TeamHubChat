import React, { useState } from 'react';
import { Paper, Typography, Avatar, Box, TextField, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from '../utils/toast';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  if (!user) return null;

  const save = async () => {
    try {
      const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
      const token = localStorage.getItem('token');
      if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
      await api.put(`/users/${user.id}`, { displayName, avatarUrl });
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Profile</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar src={avatarUrl} sx={{ width: 64, height: 64 }}>{displayName?.[0]}</Avatar>
        <TextField label="Avatar URL" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} fullWidth />
      </Box>
      <TextField label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <Button variant="contained" onClick={save}>Save Changes</Button>
    </Paper>
  );
};

export default Profile;


