import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, Button, CircularProgress, Paper, TextField, Typography } from '@mui/material';
import { authService } from '../services/authService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const AcceptInvite: React.FC = () => {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (!inviteToken) return;
    setLoading(true);
    setError(null);
    axios
      .get(`${API_BASE}/auth/invitation/${inviteToken}`)
      .then((res) => {
        const inv = res.data?.data?.invitation || res.data?.invitation || {};
        setTenantName(inv?.tenant?.name || 'TeamHub');
        setEmail(inv?.email || '');
        if (inv?.email) {
          const prefix = String(inv.email).split('@')[0];
          setDisplayName(prefix.charAt(0).toUpperCase() + prefix.slice(1));
        }
      })
      .catch((e) => setError(e?.response?.data?.message || 'Invalid or expired invitation'))
      .finally(() => setLoading(false));
  }, [inviteToken]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!inviteToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/auth/invitation/${inviteToken}/accept`, {
        password,
        displayName: displayName || email.split('@')[0],
      });
      const data = res.data?.data;
      if (data?.token && data?.user) {
        authService.setToken(data.token);
        authService.setUser(data.user);
        navigate('/', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ maxWidth: 520, width: '100%', p: 4 }} elevation={2}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Join {tenantName}
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>
        ) : (
          <form onSubmit={onSubmit}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Creating an account for <strong>{email}</strong>
            </Typography>
            <TextField
              label="Display name"
              fullWidth
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Minimum 8 characters"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Confirm password"
              type="password"
              fullWidth
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Joining…' : 'Join organization'}
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default AcceptInvite;


