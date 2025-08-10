import React, { useEffect, useMemo, useState } from 'react';
import { Paper, Avatar, Typography, Box, TextField, Grid, Card, CardContent, CardActions, CardHeader, Link, Divider, Button, Dialog, DialogContent, Chip, InputAdornment, IconButton, Menu, MenuItem, Autocomplete } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddRounded from '@mui/icons-material/AddRounded';
import MoreVert from '@mui/icons-material/MoreVert';
import AccessTime from '@mui/icons-material/AccessTime';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
// Icons removed after simplifying actions
import { fetchUsers, updateUserStatus, type OrgUser, getInvitations, revokeInvitation } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../utils/toast';
import { io as createSocket, Socket } from 'socket.io-client';

const roleColors: Record<OrgUser['role'], 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'> = {
  admin: 'primary',
  moderator: 'secondary',
  member: 'success',
  guest: 'default',
};

const MembersTable: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';
  const [members, setMembers] = useState<OrgUser[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  // Status filter removed from UI; default to 'all'
  const [statusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [emailChips, setEmailChips] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<OrgUser | null>(null);
  const [pending, setPending] = useState<Array<{ id?: string; email: string; inviteToken?: string; expiresAt?: string }>>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const load = async () => {
    const data = await fetchUsers(1, 50, search);
    setMembers(data.users);
  };

  useEffect(() => {
    load();
    // load pending invites
    getInvitations('pending').then((d: any) => {
      const list = d?.invitations || d || [];
      setPending(list.map((i: any) => ({ id: i.id, email: i.email, inviteToken: i.inviteToken, expiresAt: i.expiresAt })));
    }).catch(() => {});

    // connect socket for live updates
    try {
      const token = localStorage.getItem('token') || '';
      const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
      const s = createSocket(apiBase, { auth: { token } });
      setSocket(s);
      s.on('connect', () => {
        // already joined tenant room by server on connect
      });
      s.on('invitation-created', (payload: any) => {
        const inv = payload?.invitation;
        if (inv?.email) {
          setPending((p) => [{ id: inv.id, email: inv.email, inviteToken: inv.inviteToken, expiresAt: inv.expiresAt }, ...p]);
        }
      });
      s.on('invitation-accepted', (payload: any) => {
        const u = payload?.user;
        if (u?.email) {
          setPending((p) => p.filter(x => x.email !== u.email));
          setMembers((m) => [{
            id: u.id,
            email: u.email,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
            role: u.role,
            isActive: u.isActive,
            lastLoginAt: u.lastLoginAt,
            createdAt: u.createdAt,
          } as OrgUser, ...m]);
        }
      });
      s.on('user-activity', (payload: any) => {
        const { userId, lastActiveAt } = payload || {};
        if (userId && lastActiveAt) {
          setMembers((m) => m.map(x => x.id === userId ? { ...x, lastLoginAt: lastActiveAt } : x));
        }
      });
      return () => { s.disconnect(); };
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search input for pleasant UX
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const baseMembers = useMemo(() => members.filter(m => m.role !== 'admin'), [members]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return baseMembers.filter((m) => {
      const matchesTerm = `${m.displayName} ${m.email}`.toLowerCase().includes(term);
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = m.isActive;
      else if (statusFilter === 'inactive') matchesStatus = !m.isActive;
      return matchesTerm && matchesStatus;
    });
  }, [baseMembers, search, statusFilter]);

  const totalCount = baseMembers.length;
  const activeCount = useMemo(() => baseMembers.filter(m => m.isActive).length, [baseMembers]);

  // Role changes are removed from the card per new UX

  const handleToggleActive = async (m: OrgUser) => {
    try {
      if (!isAdminOrMod) return;
      await updateUserStatus(m.id, !m.isActive);
      setMembers(prev => prev.map(p => (p.id === m.id ? { ...p, isActive: !m.isActive } : p)));
      toast.success(`User ${!m.isActive ? 'activated' : 'deactivated'}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
    }
  };

  const handleBulkInvite = async () => {
    const list = emailChips
      .map(e => e.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    setInviting(true);
    try {
      // naive sequential send using adminService endpoint
      for (const email of list) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/invitations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ email, role: 'member' })
        });
      }
      toast.success('Invitations sent');
      setEmailChips([]);
      setInviteOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send invites');
    } finally {
      setInviting(false);
    }
  };

  const openMenu = (evt: React.MouseEvent<HTMLElement>, m: OrgUser) => {
    setMenuAnchor(evt.currentTarget);
    setMenuUser(m);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuUser(null);
  };

  const formatRelative = (date?: string) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  };

  const formatMemberSince = (date?: string) => {
    if (!date) return '—';
    try {
      const d = new Date(date);
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return new Date(date).toLocaleDateString();
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', rowGap: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Members</Typography>
          <Chip size="small" label={`Total ${totalCount}`} />
          <Chip size="small" color="success" label={`Active ${activeCount}`} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search members by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(query.trim())}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
            sx={{ minWidth: 360 }}
          />
          {/* Status dropdown removed per request */}
          {baseMembers.length > 0 && (
            <Button variant="contained" startIcon={<AddRounded />} onClick={() => setInviteOpen(true)} sx={{ borderRadius: 2 }}>Invite members</Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={2}>
        {isAdminOrMod && pending.length > 0 && (
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ mb: 1, borderRadius: 2 }}>
              <CardHeader title={<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Pending invitations</Typography>} />
              <CardContent sx={{ pt: 0 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {pending.map((i) => (
                    <Box key={i.inviteToken || i.id || i.email} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28 }}>{i.email?.[0]?.toUpperCase?.()}</Avatar>
                      <Typography variant="body2" sx={{ flex: 1 }}>{i.email}</Typography>
                      {i.expiresAt && (
                        <Typography variant="caption" color="text.secondary">expires {formatRelative(i.expiresAt)}</Typography>
                      )}
                      <Button size="small" color="inherit" onClick={async () => {
                        try {
                          if (i.id) { await revokeInvitation(i.id); }
                          setPending((p) => p.filter(x => (x.inviteToken || x.id) !== (i.inviteToken || i.id)));
                          toast.success('Invitation revoked');
                        } catch (e: any) {
                          toast.error(e.message || 'Failed to revoke');
                        }
                      }}>Revoke</Button>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
        {filtered.map((m) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={m.id}>
            <Card variant="outlined" sx={{
              p: 0,
              borderRadius: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'box-shadow 120ms ease, transform 120ms ease',
              '&:hover': { boxShadow: '0 8px 22px rgba(0,0,0,0.08)' }
            }}>
              <CardHeader
                avatar={
                  <Avatar
                    src={m.avatarUrl}
                    sx={{
                      width: 56,
                      height: 56,
                      fontWeight: 700,
                      bgcolor: m.avatarUrl ? undefined : 'transparent',
                      color: m.avatarUrl ? undefined : '#fff',
                      background: m.avatarUrl
                        ? undefined
                        : 'linear-gradient(135deg, #0B5ED7 0%, #3D8BFF 50%, #10B981 100%)'
                    }}
                  >
                    {m.displayName?.[0]?.toUpperCase()}
                  </Avatar>
                }
                title={<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{m.displayName}</Typography>}
                subheader={
                  <Box>
                    <Link href={`mailto:${m.email}`} underline="hover" color="inherit" sx={{ fontSize: 12 }}>{m.email}</Link>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Member since {formatMemberSince(m.createdAt)}</Typography>
                  </Box>
                }
                sx={{ pb: 1.5 }}
              />
              <CardContent sx={{ pt: 0 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Box sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.75,
                    px: 1.25, py: 0.5,
                    borderRadius: 9999,
                    backgroundColor: 'rgba(11,94,215,0.10)',
                    color: 'primary.main',
                    fontSize: 12, fontWeight: 700,
                    textTransform: 'capitalize'
                  }}>
                    <ShieldOutlined sx={{ fontSize: 16 }} /> {m.role}
                  </Box>
                  <Box sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.75,
                    px: 1.25, py: 0.5,
                    borderRadius: 9999,
                    backgroundColor: m.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(145,158,171,0.16)',
                    color: m.isActive ? 'success.main' : 'text.secondary',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    <CheckCircleOutline sx={{ fontSize: 16 }} /> {m.isActive ? 'Active' : 'Inactive'}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><AccessTime sx={{ fontSize: 14 }} /> {formatRelative(m.lastLoginAt)}</Typography>
                </Box>
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                <Box />
                {isAdminOrMod ? (
                  <>
                    <IconButton size="small" onClick={(e) => openMenu(e, m)}><MoreVert /></IconButton>
                    <Menu anchorEl={menuAnchor} open={menuUser?.id === m.id} onClose={closeMenu} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                      <MenuItem onClick={() => { closeMenu(); handleToggleActive(m); }}>
                        {m.isActive ? 'Deactivate' : 'Activate'}
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary">No actions</Typography>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
        {filtered.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              display: 'flex',
              justifyContent:'center',
              alignItems: 'center',
              gap: 3,
              backgroundColor: 'background.paper',
              
            }}>
              {/* Simple inline illustration */}
              <Box sx={{ width: 96, height: 96, flex: '0 0 auto' }}>
                <svg viewBox="0 0 128 128" width="96" height="96" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Invite illustration">
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3D8BFF" />
                      <stop offset="100%" stopColor="#6C63FF" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="44" r="20" fill="url(#grad)" />
                  <rect x="16" y="72" width="96" height="40" rx="12" fill="#E8F0FE" />
                  <circle cx="60" cy="44" r="8" fill="#FFFFFF" opacity="0.9" />
                  <path d="M28 84c8-8 56-8 64 0" stroke="#CAD7FB" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </Box>
              <Box >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>No members yet</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Invite your team to get started.
                </Typography>
                <Button
                  onClick={() => setInviteOpen(true)}
                  startIcon={<AddRounded />}
                  size="large"
                  sx={{
                    borderRadius: 2,
                    px: 2.5,
                    color: '#fff',
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #6C63FF 0%, #3D8BFF 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #5A54F7 0%, #2D7AF0 100%)' }
                  }}
                >
                  Invite Member
                </Button>
              </Box>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Removed secondary CTA to avoid duplicate invite buttons */}

      {/* Inline invite modal */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Invite teammates</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Type names or emails and press Enter. Use comma or space to create chips.</Typography>
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={emailChips}
            onChange={(_, newValue) => setEmailChips(newValue as string[])}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  color="default"
                  avatar={<Avatar>{option?.[0]?.toUpperCase?.()}</Avatar>}
                  label={option}
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                placeholder="Add people by email"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                    e.preventDefault();
                  }
                }}
              />
            )}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button onClick={() => setInviteOpen(false)} color="inherit">Cancel</Button>
            <Button onClick={handleBulkInvite} variant="contained" disabled={inviting || emailChips.length === 0}>Send invites</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default MembersTable;


