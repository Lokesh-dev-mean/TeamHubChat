import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box, TextField, Button, Chip, IconButton, Tooltip } from '@mui/material';
import { sendInvitation, getInvitations, revokeInvitation } from '../../services/adminService';
import { toast } from '../../utils/toast';
import { Delete } from '@mui/icons-material';

const InvitationsPanel: React.FC = () => {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState<any[]>([]);

  const load = async () => {
    const data = await getInvitations('pending');
    setPending(data.invitations || []);
  };

  useEffect(() => {
    load();
  }, []);

  const onInvite = async () => {
    try {
      const inv = await sendInvitation(email);
      toast.success('Invitation sent');
      setEmail('');
      setPending((p) => [{ email: inv.email, inviteToken: inv.inviteToken, expiresAt: inv.expiresAt }, ...p]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send invitation');
    }
  };

  const onRevoke = async (id: string) => {
    try {
      await revokeInvitation(id);
      toast.success('Invitation revoked');
      setPending((p) => p.filter((i) => i.id !== id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to revoke invitation');
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Invitations</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField size="small" label="Invite by email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button variant="contained" onClick={onInvite} disabled={!email}>Invite</Button>
      </Box>
      {pending.map((i) => (
        <Box key={i.inviteToken || i.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={i.email} />
            <Typography variant="caption" color="text.secondary">Expires: {new Date(i.expiresAt).toLocaleDateString()}</Typography>
          </Box>
          <Box>
            <Tooltip title="Revoke">
              <IconButton size="small" onClick={() => onRevoke(i.id)}>
                <Delete />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      ))}
    </Paper>
  );
};

export default InvitationsPanel;


