import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemButton, ListItemAvatar, Avatar, ListItemText, CircularProgress, Badge, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, TextField, Button } from '@mui/material';
import { Chat as ChatIcon, Search as SearchIcon } from '@mui/icons-material';
import MessageComposer from './MessageComposer';
import { listConversations, getMessages, sendMessage, createConversation } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../utils/toast';
import { fetchUsers } from '../../services/adminService';
import { io as createSocket } from 'socket.io-client';

// Explicit types to avoid any overriding unions (Sonar S6571)
type Conversation = { id: string; name: string; isGroup?: boolean };
type MessageItem = { id: string; senderId: string; messageText: string; createdAt: string };

const ChatPanel: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  // Draft managed by MessageComposer
  const endRef = useRef<HTMLDivElement>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await listConversations();
        setConversations(data.conversations || []);
        setActive((data.conversations || [])[0] || null);
      } finally {
        setLoading(false);
      }
    })();

    // realtime: conversation-created/new-message
    try {
      const token = localStorage.getItem('token') || '';
      const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
      const s = createSocket(apiBase, { auth: { token } });
      s.on('conversation-created', (payload: any) => {
        const conv = payload?.conversation;
        if (conv && !conversations.find(c => c.id === conv.id)) {
          setConversations(prev => [conv, ...prev]);
        }
      });
      s.on('new-message', (payload: any) => {
        const msg = payload?.message;
        if (!msg) return;
        // append to thread if matches active
        setMessages((m) => (active && msg.conversationId === active.id) ? [...m, {
          id: msg.id, senderId: msg.senderId, messageText: msg.messageText, createdAt: msg.createdAt
        }] : m);
      });
      return () => { s.disconnect(); };
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      if (!active) return;
      const data = await getMessages(active.id);
      setMessages(data.messages || []);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    })();
  }, [active]);

  // handled by MessageComposer

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', height: '100%', gap: 0 }}>
      {/* Conversation list */}
      <Paper sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', borderRight: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Chats</Typography>
            <Tooltip title="Start a chat">
              <IconButton size="small" onClick={() => setStartOpen(true)}>
                <ChatIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          {(conversations?.length ?? 0) === 0 ? (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">No conversations yet</Typography>
            </Box>
          ) : (
            <List sx={{ height: '100%', overflow: 'auto', p: 1 }}>
              {(conversations || []).map((c) => (
                <ListItem key={c.id} disablePadding>
                  <ListItemButton selected={active?.id === c.id} onClick={() => setActive(c)}>
                    <ListItemAvatar>
                      <Badge color="primary" variant="dot" overlap="circular">
                        <Avatar>{c.name?.[0]}</Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText primary={<Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>} secondary={c.isGroup ? 'Group' : 'Direct'} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>

      {/* Thread area */}
      <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 28, height: 28 }}>{active?.name?.[0]}</Avatar>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{active?.name || 'Select a conversation'}</Typography>
        </Box>
        <Box sx={{ flex: 1, p: 2, overflow: 'auto', backgroundColor: 'background.paper' }}>
          {(messages || []).map((m: any) => {
            const mine = m.senderId === user?.id;
            return (
              <Box key={m.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', mb: 1.2 }}>
                <Box sx={{ maxWidth: '70%', p: 1.2, px: 1.6, borderRadius: 2, backgroundColor: mine ? 'primary.main' : 'grey.100', color: mine ? 'primary.contrastText' : 'text.primary', boxShadow: 1 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.messageText}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.3 }}>{new Date(m.createdAt).toLocaleTimeString()}</Typography>
                </Box>
              </Box>
            );
          })}
          <div ref={endRef} />
        </Box>
        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <MessageComposer onSend={(text) => {
            if (!active) return;
            sendMessage(active.id, text)
              .then(res => {
                setMessages(m => [...m, res.message]);
                setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
              })
              .catch((e) => toast.error(e.message || 'Failed to send'));
          }} />
        </Box>
      </Paper>

      {/* Start chat dialog */}
      <Dialog open={startOpen} onClose={() => setStartOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start a chat</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SearchIcon fontSize="small" />
            <TextField
              autoFocus
              fullWidth
              placeholder="Search organization members by name or email"
              value={memberQuery}
              onChange={async (e) => {
                const q = e.target.value;
                setMemberQuery(q);
                const res = await fetchUsers(1, 10, q);
                setMemberResults(res.users || []);
              }}
            />
          </Box>
          <List>
            {memberResults.filter(m => m.id !== user?.id).map((m) => (
              <ListItem key={m.id} secondaryAction={
                <Button size="small" variant="contained" disabled={creating} onClick={async () => {
                  try {
                    setCreating(true);
                    const name = `${user?.displayName || 'You'} & ${m.displayName}`;
                    const data = await createConversation(name, [m.id], false);
                    const conv = data.conversation;
                    setConversations((prev) => [conv, ...prev]);
                    setActive(conv);
                    setStartOpen(false);
                  } catch (e: any) {
                    toast.error(e.message || 'Failed to start chat');
                  } finally {
                    setCreating(false);
                  }
                }}>Chat</Button>
              }>
                <ListItemAvatar><Avatar>{m.displayName?.[0]}</Avatar></ListItemAvatar>
                <ListItemText primary={m.displayName} secondary={m.email} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ChatPanel;


