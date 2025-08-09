import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Chip,
} from '@mui/material';
import {
  AccountCircle,
  Message,
  Group,
  People,
  ExitToApp,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Connect to socket when dashboard loads
  useEffect(() => {
    if (!user) return;

    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
    const newSocket = io(baseUrl, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
    
    setSocket(newSocket);
    
    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
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
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
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
            <MenuItem onClick={handleProfileMenuClose}>
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

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Routes>
          <Route index element={<DashboardHome user={user} socket={socket} />} />
          {/* Add more subroutes as needed */}
        </Routes>
      </Container>
    </Box>
  );
};

// Dashboard Home Component
interface DashboardHomeProps {
  user: any;
  socket: Socket | null;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ user, socket }) => {
  return (
    <Box>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to {user.tenant.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Hello {user.displayName}! You're connected to your organization's TeamHub workspace.
          {user.role === 'admin' && ' As an admin, you have full access to manage your organization.'}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Chip 
            label={`Role: ${user.role}`} 
            color="primary" 
            variant="outlined" 
          />
          <Chip 
            label={socket?.connected ? 'Connected' : 'Disconnected'} 
            color={socket?.connected ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Message sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" component="h2">
                Messages
              </Typography>
              <Typography variant="h4" component="p" sx={{ mt: 1 }}>
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total messages sent
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" component="h2">
                Team Members
              </Typography>
              <Typography variant="h4" component="p" sx={{ mt: 1 }}>
                1
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active users in your org
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Group sx={{ fontSize: 40, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h6" component="h2">
                Channels
              </Typography>
              <Typography variant="h4" component="p" sx={{ mt: 1 }}>
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available chat channels
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Getting Started
        </Typography>
        <Typography variant="body1" paragraph>
          Your TeamHub workspace is ready! Here's what you can do next:
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            Invite team members to join your organization
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            Create channels for different teams or projects
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            Start messaging with your team members
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            Share files and collaborate on projects
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Dashboard;