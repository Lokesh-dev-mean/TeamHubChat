import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button, CircularProgress, TextField } from '@mui/material';
import { authService } from '../services/authService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
        <h1 className="text-xl font-bold mb-2">
          Join {tenantName}
        </h1>
        {loading ? (
          <div className="flex justify-center py-12">
            <CircularProgress size={24} />
          </div>
        ) : error ? (
          <>
            <p className="text-red-600 mt-2 mb-4">{error}</p>
            <Button variant="outlined" onClick={() => navigate('/login')} fullWidth>
              Return to Login
            </Button>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <p className="text-gray-600 mb-4">
              Creating an account for <strong>{email}</strong>
            </p>
            <div className="space-y-4">
              <TextField
                label="Display name"
                fullWidth
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Minimum 8 characters"
              />
              <TextField
                label="Confirm password"
                type="password"
                fullWidth
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <Button type="submit" variant="contained" disabled={submitting} fullWidth>
                {submitting ? 'Joining…' : 'Join organization'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;


