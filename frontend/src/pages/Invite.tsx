import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button, CircularProgress } from '@mui/material';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
        <h1 className="text-xl font-bold mb-2">
          Invitation to join {invitation?.tenant?.name ? `${invitation.tenant.name}` : 'TeamHub'}
        </h1>
        {loading ? (
          <div className="flex justify-center py-12">
            <CircularProgress size={24} />
          </div>
        ) : error ? (
          <p className="text-red-600 mt-2">{error}</p>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              You were invited{invitation?.email ? ` at ${invitation.email}` : ''}.
              {invitation?.expiresAt ? ` This invite expires on ${new Date(invitation.expiresAt).toLocaleString()}.` : ''}
            </p>
            <Button onClick={handleContinue} variant="contained">Continue</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Invite;


