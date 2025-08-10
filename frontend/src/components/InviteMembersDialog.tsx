import React from 'react';
import { Dialog, DialogContent, Button, Box, Typography } from '@mui/material';

interface InviteMembersDialogProps {
  open: boolean;
  onSkip: () => void;
  onInvite: () => void;
}

// Card-style prompt to invite teammates; provides Skip and Invite actions
const InviteMembersDialog: React.FC<InviteMembersDialogProps> = ({ open, onSkip, onInvite }) => {
  return (
    <Dialog open={open} onClose={onSkip} maxWidth="sm" fullWidth>
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Invite your team</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Bring teammates into your organization to start chatting and collaborating together.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={onSkip} color="inherit">Skip for now</Button>
            <Button onClick={onInvite} variant="contained">Invite members</Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMembersDialog;


