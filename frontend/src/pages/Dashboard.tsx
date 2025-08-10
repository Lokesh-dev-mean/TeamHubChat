import React, { useEffect, useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Avatar, Menu, MenuItem, IconButton, Chip, Tooltip } from '@mui/material';
import { AccountCircle, People, ExitToApp, Chat } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import InviteMembersDialog from '../components/InviteMembersDialog';
import MembersTable from '../components/org/MembersTable';
import ProfilePanelView from '../components/profile/ProfilePanel';
import ChatPanel from '../components/chat/ChatPanel';
import { io } from 'socket.io-client';
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { fetchUsers, getInvitations } from '../services/adminService';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showInvite, setShowInvite] = useState(false);
  const navigate = useNavigate();
  
  // Connect to socket when dashboard loads
  useEffect(() => {
    if (!user) return;

    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
    const s = io(baseUrl, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });
    
    s.on('connect', () => {
      console.log('Connected to socket server');
    });
    
    s.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
    
    // Cleanup on unmount
    return () => {
      s.disconnect();
    };
  }, [user]);

  // Show invite dialog on every login if tenant has not invited members yet
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    (async () => {
      try {
        // If org still has only the first admin user
        const { pagination } = await fetchUsers(1, 2);
        const isSoloAdmin = (pagination?.total ?? 0) <= 1;
        // And there are no pending invitations
        const inv = await getInvitations('pending');
        const hasPendingInvites = (inv?.pagination?.total ?? (inv?.invitations?.length ?? 0)) > 0;
        if (user.isFirstUser || isSoloAdmin) {
          setShowInvite(!hasPendingInvites);
        }
      } catch (e) {
        // If check fails, do not block the UI; simply do not show the dialog
        console.warn('Invite-check failed', e);
      }
    })();
  }, [user]);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
  };

  if (!user) {
    return null; // This shouldn't happen due to ProtectedRoute, but just in case
  }
  
  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: 'background.default' }}>
      <AppBar position="static" color="inherit" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, letterSpacing: 0.2 }}>
            TeamHub
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={user.tenant.name}
              size="small"
              color="secondary"
              sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {user.displayName}
              </Typography>
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                {user.avatarUrl ? (
                  <Avatar src={user.avatarUrl} sx={{ width: 32, height: 32 }} />
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/dashboard/profile'); }}>
              <AccountCircle sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', height: 'calc(100vh - 64px)', gap: 0 }}>
        {/* Minimal left rail with route-aware highlights */}
        <Box sx={{ width: 72, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, gap: 1, backgroundColor: 'background.paper' }}>
          <NavLink to="chat" style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <Tooltip title="Chat" placement="right"><IconButton color={isActive ? 'primary' : 'default'}><Chat /></IconButton></Tooltip>
            )}
          </NavLink>
          <NavLink to="organization" style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <Tooltip title="Organization" placement="right"><IconButton color={isActive ? 'primary' : 'default'}><People /></IconButton></Tooltip>
            )}
          </NavLink>
        </Box>

        <Box sx={{ minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route index element={<Navigate to="chat" replace />} />
            <Route path="chat" element={<Box sx={{ flex: 1, minHeight: 0 }}><ChatPanel /></Box>} />
            <Route path="organization" element={<Box sx={{ p: 2 }}><MembersTable /></Box>} />
            <Route path="profile" element={<Box sx={{ p: 2 }}><ProfilePanelView /></Box>} />
            <Route path="*" element={<Navigate to="chat" replace />} />
          </Routes>
        </Box>
      </Box>

      <InviteMembersDialog 
        open={showInvite} 
        onSkip={() => setShowInvite(false)} 
        onInvite={() => {
          setShowInvite(false);
          navigate('/organization');
        }} 
      />
    </Box>
  );
};






export default Dashboard;