import React, { useEffect, useState } from 'react';
import { TextField, Button, Chip, IconButton, Tooltip } from '@mui/material';
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
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Invitations</h2>
      <div className="flex gap-2 mb-4">
        <TextField size="small" label="Invite by email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button variant="contained" onClick={onInvite} disabled={!email}>Invite</Button>
      </div>
      {pending.map((i) => (
        <div key={i.inviteToken || i.id} className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Chip label={i.email} />
            <span className="text-xs text-gray-500">Expires: {new Date(i.expiresAt).toLocaleDateString()}</span>
          </div>
          <div>
            <Tooltip title="Revoke">
              <IconButton size="small" onClick={() => onRevoke(i.id)}>
                <Delete />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InvitationsPanel;


