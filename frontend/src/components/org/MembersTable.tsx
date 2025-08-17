import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, TextField, Button, Dialog, DialogContent, Chip, InputAdornment, IconButton, Menu, MenuItem, Autocomplete } from '@mui/material';
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
      const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
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
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header Section */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Members</h2>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {totalCount} total
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {activeCount} active
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TextField
              size="small"
              placeholder="Search members by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setSearch(query.trim())}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
              className="min-w-[320px]"
            />
            {baseMembers.length > 0 && isAdminOrMod && (
              <Button 
                variant="contained" 
                startIcon={<AddRounded />} 
                onClick={() => setInviteOpen(true)} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm"
              >
                Invite members
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content Section with proper scrolling */}
      <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="space-y-4">
          {isAdminOrMod && pending.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-amber-800">Pending Invitations ({pending.length})</h3>
              </div>
              <div className="space-y-2">
                {pending.map((i) => (
                  <div key={i.inviteToken || i.id || i.email} className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-amber-100">
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#f59e0b' }}>{i.email?.[0]?.toUpperCase?.()}</Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{i.email}</p>
                      {i.expiresAt && (
                        <p className="text-xs text-amber-600">Expires {formatRelative(i.expiresAt)}</p>
                      )}
                    </div>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={async () => {
                        try {
                          if (i.id) { await revokeInvitation(i.id); }
                          setPending((p) => p.filter(x => (x.inviteToken || x.id) !== (i.inviteToken || i.id)));
                          toast.success('Invitation revoked');
                        } catch (e: any) {
                          toast.error(e.message || 'Failed to revoke');
                        }
                      }}
                      className="text-amber-700 border-amber-300 hover:bg-amber-50"
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {filtered.map((m) => (
            <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-200">
              <div className="flex items-start gap-4">
                <Avatar
                  src={m.avatarUrl}
                  sx={{
                    width: 64,
                    height: 64,
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
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{m.displayName}</h3>
                  <div className="space-y-1">
                    <a href={`mailto:${m.email}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline block">{m.email}</a>
                    <p className="text-xs text-gray-500">Member since {formatMemberSince(m.createdAt)}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium capitalize">
                    <ShieldOutlined sx={{ fontSize: 18 }} />
                    {m.role}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    m.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                  }`}>
                    <CheckCircleOutline sx={{ fontSize: 18 }} />
                    {m.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <AccessTime sx={{ fontSize: 16 }} />
                  <span>Last active {formatRelative(m.lastLoginAt)}</span>
                </div>
              </div>
              
              {isAdminOrMod && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-end">
                    <IconButton 
                      size="small" 
                      onClick={(e) => openMenu(e, m)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <MoreVert />
                    </IconButton>
                    <Menu anchorEl={menuAnchor} open={menuUser?.id === m.id} onClose={closeMenu} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                      <MenuItem onClick={() => { closeMenu(); handleToggleActive(m); }}>
                        {m.isActive ? 'Deactivate' : 'Activate'}
                      </MenuItem>
                    </Menu>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No members yet</h3>
                <p className="text-gray-600 mb-6">
                  {isAdminOrMod ? 'Invite your team to get started.' : 'No other members in the organization yet.'}
                </p>
                {isAdminOrMod && (
                  <Button
                    onClick={() => setInviteOpen(true)}
                    startIcon={<AddRounded />}
                    size="large"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm"
                  >
                    Invite Member
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline invite modal */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <AddRounded className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Invite teammates</h3>
            <p className="text-gray-600">Type names or emails and press Enter. Use comma or space to create chips.</p>
          </div>
          
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
          
          <div className="flex justify-end gap-3 mt-6">
            <Button 
              onClick={() => setInviteOpen(false)} 
              variant="outlined"
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkInvite} 
              variant="contained" 
              disabled={inviting || emailChips.length === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700"
            >
              {inviting ? 'Sending...' : 'Send invites'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersTable;


