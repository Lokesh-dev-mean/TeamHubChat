import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface InvitationDetails {
  email: string;
  role?: string;
  expiresAt?: string;
  tenant?: { name?: string };
}

const Invite: React.FC = () => {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);

  useEffect(() => {
    if (!inviteToken) return;
    setLoading(true);
    setError(null);
    axios
      .get(`${API_BASE}/auth/invitation/${inviteToken}`)
      .then((res) => {
        const inv = res.data?.data?.invitation || res.data?.invitation || null;
        setInvitation(inv);
      })
      .catch((e) => {
        setError(e?.response?.data?.message || 'Invalid or expired invitation');
      })
      .finally(() => setLoading(false));
  }, [inviteToken]);

  const handleContinue = () => {
    navigate(`/invite/${inviteToken}/accept`, { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ maxWidth: 520, width: '100%', p: 4 }} elevation={2}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Invitation to join {invitation?.tenant?.name ? `${invitation.tenant.name}` : 'TeamHub'}
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You were invited{invitation?.email ? ` at ${invitation.email}` : ''}.
              {invitation?.expiresAt ? ` This invite expires on ${new Date(invitation.expiresAt).toLocaleString()}.` : ''}
            </Typography>
            <Button onClick={handleContinue} variant="contained">Continue</Button>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default Invite;


