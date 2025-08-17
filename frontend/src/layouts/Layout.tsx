import React, { useEffect, useState } from 'react';
import { Box, IconButton, Menu, MenuItem, Avatar, Tooltip } from '@mui/material';
import { Routes, Route, Navigate, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; 
import InviteMembersDialog from '../components/InviteMembersDialog';
import MembersTable from '../components/org/MembersTable'; 
import ChatPanel from '../components/chat/ChatPanel';
import { io } from 'socket.io-client';
import { fetchUsers, getInvitations } from '../services/adminService';
import { AccountCircle, ExitToApp, People, Chat } from '@mui/icons-material';
import Profile from '../pages/Profile';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const navigate = useNavigate();

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

  if (!user) return null;

  const [showInvite, setShowInvite] = useState(false);
  
  // Socket connection effect
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
    
    return () => {
      s.disconnect();
    };
  }, [user]);

  // Invite dialog effect
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    (async () => {
      try {
        const { pagination } = await fetchUsers(1, 2);
        const isSoloAdmin = (pagination?.total ?? 0) <= 1;
        const inv = await getInvitations('pending');
        const hasPendingInvites = (inv?.pagination?.total ?? (inv?.invitations?.length ?? 0)) > 0;
        if (user.isFirstUser || isSoloAdmin) {
          setShowInvite(!hasPendingInvites);
        }
      } catch (e) {
        console.warn('Invite-check failed', e);
      }
    })();
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="bg-white border-b-[1px] border-b-gray-200">
        <div className="flex items-center justify-between px-4 py-2 ">
          <h1 className="text-xl font-semibold tracking-wide">
            TeamHub
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="px-2 py-1 text-sm bg-primary/10 text-primary rounded">
              {user.tenant.name}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-sm">
                {user.displayName}
              </span>
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                {user.avatarUrl ? (
                  <Avatar src={user.avatarUrl} className="w-8 h-8" />
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
            </div>
          </div>

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
        </div>
      </div>

      <div className=" flex flex-row h-[calc(100vh-58px)] relative">
        <div className="w-[72px] border-r border-gray-200 flex flex-col items-center py-4 gap-2 bg-white">
          <NavLink to="/chat" className="no-underline">
            {({ isActive }) => (
              <Tooltip title="Chat" placement="right">
                <IconButton color={isActive ? 'primary' : 'default'}><Chat /></IconButton>
              </Tooltip>
            )}
          </NavLink>
          <NavLink to="/organization" className="no-underline">
            {({ isActive }) => (
              <Tooltip title="Organization" placement="right">
                <IconButton color={isActive ? 'primary' : 'default'}><People /></IconButton>
              </Tooltip>
            )}
          </NavLink>
        </div>

        <div className="min-w-0 h-full flex flex-col w-full">
        <Routes>
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat" element={<div className="flex-1 min-h-0"><ChatPanel /></div>} />
          <Route path="organization" element={<div className="p-4"><MembersTable /></div>} />
          <Route path="profile" element={<div className="p-4"><Profile /></div>} />
          <Route path="*" element={<Navigate to="chat" replace />} />
        </Routes>

        <InviteMembersDialog 
          open={showInvite} 
          onSkip={() => setShowInvite(false)} 
          onInvite={() => {
            setShowInvite(false);
            navigate('/dashboard/organization');
          }} 
        />
        </div>
      </div>
  </div>
    
  );
};

export default Layout;
