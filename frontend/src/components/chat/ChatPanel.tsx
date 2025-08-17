import React, { useEffect, useRef, useState, useCallback, JSX } from 'react';
import { 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemAvatar, 
  Avatar, 
  ListItemText, 
  CircularProgress, 
  Badge, 
  IconButton, 
  Tooltip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  TextField, 
  Button, 
  Chip,
  Box
} from '@mui/material';
import {
  Chat as ChatIcon,
  Search as SearchIcon,
  Group as GroupsIcon,
  Person as PersonIcon,
  Videocam as VideocamIcon,
  Call as CallIcon,
  MoreVert as MoreVertIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  Send as SendIcon,
  ScheduleSend
} from '@mui/icons-material';
import MessageComposer from './MessageComposer';
import { listConversations, getMessages, sendMessage, createConversation } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../utils/toast';
import { fetchUsers } from '../../services/adminService';
import { userStatusService } from '../../services/userStatusService';
import UserStatusIndicator from '../UserStatusIndicator';
import SocketDebugger from './SocketDebugger';

import { io as createSocket } from 'socket.io-client';
import { useTheme } from '@mui/material/styles';

interface Participant {
  userId: string;
  user: {
    id: string;
    displayName: string;
    status?: 'Online' | 'Away' | 'Busy' | 'Offline';
    lastSeen?: string;
  };
}

interface Conversation {
  id: string;
  name: string;
  isGroup: boolean;
  participants: Participant[];
  lastMessage?: {
    id: string;
    senderId: string;
    messageText: string;
    createdAt: string;
    read: boolean;
  };
  unreadCount?: number;
}

interface MessageItem {
  id: string;
  senderId: string;
  messageText: string;
  createdAt: string;
}

const getOtherParticipant = (conversation: Conversation | undefined, userId: string | undefined) => {
  if (!conversation || !userId) return undefined;
  return conversation.participants?.find(p => p.userId !== userId)?.user;
};

const getDisplayName = (conversation: Conversation | undefined, userId: string | undefined) => {
  if (!conversation) return 'Select a conversation';
  if (conversation.isGroup) return conversation.name;
  const otherUser = getOtherParticipant(conversation, userId);
  return otherUser?.displayName || conversation.name;
};

const getAvatarLetter = (conversation: Conversation | undefined, userId: string | undefined) => {
  if (!conversation) return '?';
  if (conversation.isGroup) return conversation.name?.[0];
  const otherUser = getOtherParticipant(conversation, userId);
  return otherUser?.displayName?.[0] || conversation.name?.[0];
};

const getConversationType = (conversation: Conversation | undefined) => {
  if (!conversation) return '';
  return conversation.isGroup ? 'Group chat' : '';
};

const getMessageSenderName = (senderId: string, user: any, active: Conversation | undefined) => {
  if (senderId === user?.id) return user?.displayName?.[0];
  return active?.participants?.find(p => p.userId === senderId)?.user?.displayName?.[0] || '?';
};

const formatMessageTime = (createdAt: string) => {
  return new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getParticipantIcon = (isGroup: boolean) => {
  return isGroup ? <GroupsIcon fontSize="inherit" /> : <PersonIcon fontSize="inherit" />;
};

const getParticipantType = (isGroup: boolean) => {
  return isGroup ? 'Group' : 'Direct';
};

const formatLastMessageDate = (date: string) => {
  const messageDate = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return messageDate.toLocaleDateString([], { weekday: 'short' });
  } else {
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

const getLastMessagePreview = (message: string) => {
  return message.length > 50 ? message.substring(0, 47) + '...' : message;
};

const getLastMessageSender = (senderId: string, user: any, conversation: Conversation) => {
  if (senderId === user?.id) return 'You';
  if (conversation.isGroup) {
    return conversation.participants?.find(p => p.userId === senderId)?.user?.displayName?.split(' ')[0] || 'Unknown';
  }
  // For direct messages, show the other participant's name
  const otherUser = conversation.participants?.find(p => p.userId !== user?.id)?.user;
  return otherUser?.displayName?.split(' ')[0] || 'Unknown';
};

const getMessageGroupDate = (date: string) => {
  const messageDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDate.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return messageDate.toLocaleDateString([], { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};

const getPatientStatus = (conversation: Conversation | undefined, userId: string | undefined, userStatuses: Record<string, 'Online' | 'Away' | 'Busy' | 'Offline'>) => {
  if (!conversation || !userId) return '';
  if (conversation.isGroup) return '';
  
  // For direct messages, show the other participant's status
  const otherUser = conversation.participants?.find(p => p.userId !== userId)?.user;
  if (!otherUser) return '';
  
  // Return the actual status from userStatuses state, or 'Offline' as default
  return userStatuses[otherUser.id] || 'Offline';
};

const ChatPanel = (): JSX.Element => {
  const theme = useTheme();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleAnchor, setScheduleAnchor] = useState<null | HTMLElement>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  // Draft managed by MessageComposer
  const endRef = useRef<HTMLDivElement>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [messageSearchExpanded, setMessageSearchExpanded] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Record<string, 'Online' | 'Away' | 'Busy' | 'Offline'>>({});

  // Add loading states
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tempMessageId, setTempMessageId] = useState<string | null>(null);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Socket state
  const [socket, setSocket] = useState<any>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Add the file handling function
  const handleFileChange = () => {
    const files = fileRef.current?.files;
    if (files && files.length > 0) {
      toast.info('Attachments will be sent with next message');
      // TODO: Handle file upload
    }
  };

  const handleSend = async (messageText: string) => {
    if (!active || !user) return;
    
    setSendingMessage(true);
    const tempId = `temp-${Date.now()}`;
    setTempMessageId(tempId);
    
    try {
      // Create a temporary message for optimistic UI update
      const newMessage = {
        id: tempId,
        conversationId: active.id,
        senderId: user.id,
        messageText,
        createdAt: new Date().toISOString(),
        read: true
      };
      
      // Optimistically update the UI
      setMessages(prev => [...prev, newMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      // Send the message to the server
      const sentMessage = await sendMessage(active.id, messageText);
      
      // Update the message with the server response
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, id: sentMessage.id } : msg
        )
      );
      
      // Update the conversation list with the last message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === active.id
            ? {
                ...conv,
                lastMessage: {
                  id: sentMessage.id,
                  senderId: sentMessage.senderId,
                  messageText: sentMessage.messageText,
                  createdAt: sentMessage.createdAt,
                  read: true
                },
                unreadCount: 0
              }
            : conv
        )
      );
      
      return sentMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Remove the optimistic update if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      throw error;
    } finally {
      setSendingMessage(false);
      setTempMessageId(null);
      setScheduleAnchor(null);
    }
  };
     // Load initial conversations
   useEffect(() => {
     (async () => {
       try {
         const data = await listConversations();
         const conversations = data.conversations || [];
         
         // Set initial statuses for all participants
         const initialStatuses: Record<string, 'Online' | 'Away' | 'Busy' | 'Offline'> = {};
         
         // Fetch real statuses from backend for all participants
         try {
           const participantIds = conversations.flatMap(conv => 
             conv.participants
               .filter(p => p.user.id !== user?.id)
               .map(p => p.user.id)
           );
           
           if (participantIds.length > 0) {
             const statuses = await userStatusService.getMultipleUserStatuses(participantIds);
             
                      // Convert backend status format to frontend format
         participantIds.forEach(userId => {
           const status = statuses[userId];
           if (status && status.status) {
             initialStatuses[userId] = status.status === 'online' ? 'Online' : 
                                     status.status === 'away' ? 'Away' : 
                                     status.status === 'busy' ? 'Busy' : 'Offline';
           } else {
             initialStatuses[userId] = 'Offline';
           }
         });
           }
         } catch (error) {
           console.error('Error fetching user statuses:', error);
           // Fallback to offline status if API fails
           conversations.forEach(conv => {
             conv.participants.forEach(p => {
               if (p.user.id !== user?.id) {
                 initialStatuses[p.user.id] = 'Offline';
               }
             });
           });
         }
         
         setUserStatuses(initialStatuses);
         setConversations(conversations);
         setActive(conversations[0] || null);
       } finally {
         setLoading(false);
       }
     })();
   }, [user?.id]);

  // Refresh user statuses when conversations change
  useEffect(() => {
    if (conversations.length > 0 && user?.id) {
      refreshUserStatuses();
    }
  }, [conversations, user?.id]);

  // Set up periodic refresh of user statuses (every 30 seconds)
  useEffect(() => {
    if (!conversations.length || !user?.id) return;
    
    refreshUserStatuses(); // Initial refresh
    const interval = setInterval(refreshUserStatuses, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [conversations, user?.id]);

  // Update user status to offline when component unmounts or user navigates away
  useEffect(() => {
    if (!user?.id) return;

    const resetInactivityTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      if (user?.id) {
        // Set user to away after 5 minutes of inactivity
        inactivityTimer = setTimeout(async () => {
          try {
            await userStatusService.updateUserStatus(user.id, 'away');
            setUserStatuses(prev => ({
              ...prev,
              [user.id]: 'Away'
            }));
          } catch (error) {
            console.error('Error updating user status to away:', error);
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    };

    const handleBeforeUnload = async () => {
      if (user?.id) {
        try {
          await userStatusService.updateUserStatus(user.id, 'offline');
        } catch (error) {
          console.error('Error updating user status on page unload:', error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (user?.id) {
        try {
          if (document.hidden) {
            // User switched to another tab or minimized browser
            await userStatusService.updateUserStatus(user.id, 'away');
            setUserStatuses(prev => ({
              ...prev,
              [user.id]: 'Away'
            }));
          } else {
            // User came back to the tab
            await userStatusService.updateUserStatus(user.id, 'online');
            setUserStatuses(prev => ({
              ...prev,
              [user.id]: 'Online'
            }));
          }
        } catch (error) {
          console.error('Error updating user status on visibility change:', error);
        }
      }
    };

    const handleUserActivity = () => {
      resetInactivityTimer();
      
      // If user was away, set them back to online
      if (user?.id && userStatuses[user.id] === 'Away') {
        userStatusService.updateUserStatus(user.id, 'online').then(() => {
          setUserStatuses(prev => ({
            ...prev,
            [user.id]: 'Online'
          }));
        }).catch(error => {
          console.error('Error updating user status to online:', error);
        });
      }
    };

    // Set up activity listeners
    const activityListeners = [
      { event: 'beforeunload', handler: handleBeforeUnload },
      { event: 'visibilitychange', handler: handleVisibilityChange },
      { event: 'mousedown', handler: handleUserActivity },
      { event: 'keydown', handler: handleUserActivity },
      { event: 'scroll', handler: handleUserActivity },
      { event: 'touchstart', handler: handleUserActivity }
    ];

    // Add all event listeners
    activityListeners.forEach(({ event, handler }) => {
      const target = event === 'visibilitychange' ? document : window;
      target.addEventListener(event as any, handler as any);
    });

    // Start inactivity timer
    resetInactivityTimer();

    return () => {
      // Remove all event listeners
      activityListeners.forEach(({ event, handler }) => {
        const target = event === 'visibilitychange' ? document : window;
        target.removeEventListener(event as any, handler as any);
      });
      
      // Clear any pending timeouts
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      // Update status to offline when component unmounts
      if (user?.id) {
        userStatusService.updateUserStatus(user.id, 'offline').catch(error => {
          console.error('Error updating user status on unmount:', error);
        });
      }
    };
  }, [user?.id, userStatuses]);

  // Function to refresh user statuses
  const refreshUserStatuses = async () => {
    if (!conversations.length || !user?.id) return;
    
    try {
      const participantIds = conversations.flatMap(conv => 
        conv.participants
          .filter(p => p.user.id !== user.id)
          .map(p => p.user.id)
      );
      
      if (participantIds.length > 0) {
        const statuses = await userStatusService.getMultipleUserStatuses(participantIds);
        
        const newStatuses: Record<string, 'Online' | 'Away' | 'Busy' | 'Offline'> = {};
        participantIds.forEach(userId => {
          const status = statuses[userId];
          if (status) {
            newStatuses[userId] = status.status === 'online' ? 'Online' : 
                                 status.status === 'away' ? 'Away' : 
                                 status.status === 'busy' ? 'Busy' : 'Offline';
          } else {
            newStatuses[userId] = 'Offline';
          }
        });
        
        setUserStatuses(newStatuses);
      }
    } catch (error) {
      console.error('Error refreshing user statuses:', error);
    }
  };

  // Socket connection and event handlers
  useEffect(() => {
    if (!user) return;
    
    const connectSocket = () => {
      try {
        const token = localStorage.getItem('token') || '';
        if (!token) {
          console.error('No authentication token found');
          toast.error('Authentication required. Please log in again.');
          return;
        }
        
        // Fix: Use correct backend URL (port 5000, not 3000)
        const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api$/, '');
        console.log('🔌 Connecting to Socket.IO at:', apiBase);
        
        newSocket = createSocket(apiBase, { 
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          forceNew: true
        });

        // Set socket in component state
        setSocket(newSocket);

        // Connection event handlers
        newSocket.on('connect', () => {
          console.log('✅ Socket.IO connected successfully, ID:', newSocket.id);
          setSocketConnected(true);
          reconnectAttempts = 0;
          
          // Join all conversations immediately
          newSocket.emit('join-conversations');
          
          // Also join the active conversation if available
          if (active?.id) {
            newSocket.emit('join-conversation', active.id);
          }
        });

        newSocket.on('connect_error', (error: any) => {
          console.error('❌ Socket.IO connection error:', error);
          setSocketConnected(false);
          
          if (error.message === 'Authentication failed') {
            toast.error('Authentication failed. Please log in again.');
            // Redirect to login or refresh token
            localStorage.removeItem('token');
            window.location.href = '/login';
          } else {
            toast.error('Real-time connection failed. Messages may not update in real-time.');
          }
        });

        newSocket.on('disconnect', (reason: string) => {
          console.log('🔌 Socket.IO disconnected:', reason);
          setSocketConnected(false);
          
          if (reason === 'io server disconnect') {
            // Server disconnected, try to reconnect
            console.log('🔄 Server disconnected, attempting to reconnect...');
            setTimeout(() => {
              if (newSocket && !newSocket.connected) {
                newSocket.connect();
              }
            }, 1000);
          } else if (reason === 'io client disconnect') {
            console.log('🔄 Client disconnected');
          }
        });

        newSocket.on('reconnect', (attemptNumber: number) => {
          console.log('✅ Socket.IO reconnected after', attemptNumber, 'attempts');
          setSocketConnected(true);
          reconnectAttempts = 0;
          
          // Re-join conversations after reconnection
          newSocket.emit('join-conversations');
          if (active?.id) {
            newSocket.emit('join-conversation', active.id);
          }
        });

        newSocket.on('reconnect_error', (error: any) => {
          console.error('❌ Socket.IO reconnection error:', error);
          setSocketConnected(false);
          reconnectAttempts++;
          
          if (reconnectAttempts >= maxReconnectAttempts) {
            toast.error('Failed to reconnect. Please refresh the page.');
          }
        });

        newSocket.on('reconnect_failed', () => {
          console.error('❌ Socket.IO reconnection failed after all attempts');
          setSocketConnected(false);
          toast.error('Real-time connection lost. Please refresh the page.');
        });

        // Conversation events
        newSocket.on('conversation-created', (payload: any) => {
          const conv = payload?.conversation;
          if (conv) {
            console.log('📝 New conversation created:', conv.id);
            setConversations(prev => {
              // Only add if not already in the list
              if (!prev.find(c => c.id === conv.id)) {
                // Join the new conversation room
                newSocket.emit('join-conversation', conv.id);
                return [conv, ...prev];
              }
              return prev;
            });
          }
        });

        // Message events
        newSocket.on('new-message', (payload: any) => {
          const msg = payload?.message;
          if (!msg) return;
          
          console.log('📨 Received new message via Socket.IO:', msg);
          
          // Add message to current conversation if it matches and not already present
          setMessages(m => {
            // Check if message already exists
            if (m.some(existing => existing.id === msg.id)) {
              console.log('Message already exists, skipping:', msg.id);
              return m;
            }
            
            if (active && msg.conversationId === active.id) {
              console.log('Adding new message to active conversation:', msg.id);
              return [...m, {
                id: msg.id,
                senderId: msg.senderId,
                messageText: msg.messageText,
                createdAt: msg.createdAt
              }];
            }
            return m;
          });

          // Update conversation list with latest message
          setConversations(prev => prev.map(conv => {
            if (conv.id === msg.conversationId) {
              return {
                ...conv,
                lastMessage: {
                  id: msg.id,
                  senderId: msg.senderId,
                  messageText: msg.messageText,
                  createdAt: msg.createdAt,
                  read: false
                },
                unreadCount: conv.unreadCount ? conv.unreadCount + 1 : 1
              };
            }
            return conv;
          }));

          // Scroll to bottom for new messages
          setTimeout(() => {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        });

        // Handle user status updates
        newSocket.on('user-status-change', (payload: any) => {
          const { userId, status } = payload;
          if (userId && status) {
            console.log('👤 User status change:', userId, status);
            // Convert backend status format to frontend format
            const frontendStatus = status === 'online' ? 'Online' : 
                                  status === 'away' ? 'Away' : 
                                  status === 'busy' ? 'Busy' : 'Offline';
            
            setUserStatuses(prev => ({
              ...prev,
              [userId]: frontendStatus
            }));
            
            // Update conversations to reflect new status
            setConversations(prev => prev.map(conv => ({
              ...conv,
              participants: conv.participants.map(p => ({
                ...p,
                user: {
                  ...p.user,
                  status: p.user.id === userId ? frontendStatus : p.user.status
                }
              }))
            })));
          }
        });

        // Handle user online/offline events
        newSocket.on('user-online', (payload: any) => {
          const { userId } = payload;
          if (userId) {
            console.log('🟢 User online:', userId);
            setUserStatuses(prev => ({
              ...prev,
              [userId]: 'Online'
            }));
            
            // Update conversations
            setConversations(prev => prev.map(conv => ({
              ...conv,
              participants: conv.participants.map(p => ({
                ...p,
                user: {
                  ...p.user,
                  status: p.user.id === userId ? 'Online' : p.user.status
                }
              }))
            })));
          }
        });

        newSocket.on('user-offline', (payload: any) => {
          const { userId } = payload;
          if (userId) {
            console.log('🔴 User offline:', userId);
            setUserStatuses(prev => ({
              ...prev,
              [userId]: 'Offline'
            }));
            
            // Update conversations
            setConversations(prev => prev.map(conv => ({
              ...conv,
              participants: conv.participants.map(p => ({
                ...p,
                user: {
                  ...p.user,
                  status: p.user.id === userId ? 'Offline' : p.user.status
                }
              }))
            })));
          }
        });

        // Test event to verify connection
        newSocket.on('connect', () => {
          // Send a test event to verify the connection is working
          setTimeout(() => {
            if (newSocket.connected) {
              newSocket.emit('test-connection', { 
                userId: user?.id, 
                timestamp: new Date().toISOString() 
              });
            }
          }, 1000);
        });

        // Handle test connection response
        newSocket.on('test-connection-response', (data) => {
          console.log('✅ Test connection response received:', data);
          if (data.success) {
            console.log('🎯 Socket.IO connection verified and working');
          }
        });

        // Handle pong response for health checks
        newSocket.on('pong', (data) => {
          console.log('🏓 Pong received:', data);
        });

      } catch (error) {
        console.error('❌ Error setting up Socket.IO:', error);
        toast.error('Failed to establish real-time connection');
      }
    };

    // Initial connection
    connectSocket();

    // Cleanup function
    return () => {
      if (newSocket) {
        console.log('🧹 Cleaning up Socket.IO connection');
        newSocket.off('connect');
        newSocket.off('connect_error');
        newSocket.off('disconnect');
        newSocket.off('reconnect');
        newSocket.off('reconnect_error');
        newSocket.off('reconnect_failed');
        newSocket.off('conversation-created');
        newSocket.off('new-message');
        newSocket.off('user-status-change');
        newSocket.off('user-online');
        newSocket.off('user-offline');
        newSocket.off('test-connection');
        newSocket.off('test-connection-response');
        newSocket.off('pong'); // Added pong off
        newSocket.disconnect();
      }
    };
  }, [user?.id, active?.id]); // Re-run when user or active conversation changes

  // Add periodic connection health check
  useEffect(() => {
    if (!socket || !socketConnected) return;

    const healthCheckInterval = setInterval(() => {
      if (socket && socket.connected) {
        // Send a ping to keep the connection alive
        socket.emit('ping', { timestamp: new Date().toISOString() });
        console.log('🏓 Connection health check: ping sent');
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, [socket, socketConnected]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!active?.id) return;
    
    const loadMessages = async () => {
      try {
        setLoading(true);
        const data = await getMessages(active.id);
        setMessages(data.messages || []);
        
        // Mark messages as read
        if (socket && socket.connected) {
          socket.emit('mark-messages-read', { 
            conversationId: active.id 
          });
        }
        
        // Scroll to bottom after a short delay to ensure DOM is updated
        setTimeout(() => {
          if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();
  }, [active?.id, socket]);

  useEffect(() => {
    (async () => {
      if (!active) return;
      
      try {
        console.log('Loading messages for conversation:', active.id);
        const data = await getMessages(active.id);
        const newMessages = data.messages || [];
        
        // Filter out any duplicate messages
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
          return [...prev, ...uniqueNewMessages];
        });
        
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      }
    })();
  }, [active]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !active?.id) return;
    
    // Load more messages when scrolling near the top
    if (container.scrollTop < 100) {
      setLoadingMore(true);
      
      // Simulate loading more messages (replace with actual API call)
      const loadMore = async () => {
        try {
          // TODO: Implement actual pagination
          // const data = await getMessages(active.id, nextPage);
          // setMessages(prev => [...(data.messages || []), ...prev]);
        } catch (error) {
          console.error('Error loading more messages:', error);
          toast.error('Failed to load more messages');
        } finally {
          setLoadingMore(false);
        }
      };
      
      loadMore();
    }
  }, [loadingMore, active?.id]);

  // Real-time status updates would be handled here via WebSocket
  // when users change their status or go online/offline
  useEffect(() => {
    if (!active || active.isGroup) return;
    
    // In a real implementation, you would:
    // 1. Listen for user status changes via WebSocket
    // 2. Update the status when users go online/offline/busy
    // 3. Handle presence indicators (typing, last seen, etc.)
    
    // For now, status is static based on user ID
  }, [active]);

  // Handle new message from socket
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (payload: { message?: MessageItem & { conversationId: string } }) => {
      const message = payload?.message;
      if (!message) return;

      console.log('📨 New message received:', message);

      // Update messages if it's for the active conversation
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m.id === message.id)) return prev;
        
        return [...prev, message];
      });

      // Update conversation list with the new last message
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessage: {
                id: message.id,
                senderId: message.senderId,
                messageText: message.messageText,
                createdAt: message.createdAt,
                read: message.senderId === user.id // Mark as read if it's our own message
              },
              unreadCount: message.senderId === user.id ? 0 : (conv.unreadCount || 0) + 1
            };
          }
          return conv;
        })
      );

      // Scroll to bottom if it's the active conversation
      if (active?.id === message.conversationId) {
        setTimeout(() => {
          if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };

    socket.on('new-message', handleNewMessage);
    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket, active?.id, user]);

  if (loading) return <div className="p-8 flex justify-center"><CircularProgress /></div>;

  return (
    <div className="grid grid-cols-[320px_1fr] h-full w-full bg-gray-50 overflow-hidden">
      {/* Conversation list */}
      <div className="flex flex-col h-full bg-white overflow-hidden border-r border-gray-200 shadow-sm">
        {/* Chat Header - Fixed at top */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
              {/* Current user status indicator */}
              {user?.id && (
                <UserStatusIndicator 
                  status={userStatuses[user.id] || 'Online'} 
                  size="small" 
                  showText={false}
                />
              )}
              {/* Socket connection status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-500">
                  {socketConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200">
                <span className="text-lg">⋯</span>
              </button>
              <button 
                onClick={() => setSearchExpanded(!searchExpanded)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <SearchIcon className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200">
                <ChatIcon className="w-5 h-5" />
              </button>
              <button className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
                     {/* Search Bar - Expandable */}
           {searchExpanded && (
             <div className="relative mb-4 animate-in slide-in-from-top duration-200">
               <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
               <input
                 type="text"
                 placeholder="Search chats..."
                 className="w-full pl-10 pr-10 py-2.5 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 bg-white shadow-lg transition-all duration-200"
                 autoFocus
               />
               <button 
                 onClick={() => setSearchExpanded(false)}
                 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
           )}
        </div>

        {/* Chat Filters - Fixed below header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200">
              Unread
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-sm">
              Chats
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200">
              Meeting chats
            </button>
          </div>
        </div>

        {/* Conversation List - Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
          {(conversations?.length ?? 0) === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 flex-col gap-3 p-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <ChatIcon className="text-2xl text-gray-400" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-700 mb-1">No conversations yet</p>
                <p className="text-sm text-gray-500">Start a new chat to begin messaging</p>
              </div>
            </div>
          ) : (
            <div className="py-2">
              {(conversations || []).map((c) => (
                <div 
                  key={c.id}
                  className={`px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                    active?.id === c.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                  onClick={() => {
                    setActive(c);
                    if (c.unreadCount) {
                      getMessages(c.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium transition-all duration-200 ${
                        active?.id === c.id ? 'bg-blue-600 shadow-md' : 'bg-gray-400 hover:bg-gray-500'
                      }`}>
                        {getAvatarLetter(c, user?.id)}
                      </div>
                      {/* Status indicators like in the image */}
                      {c.isGroup && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          A
                        </div>
                      )}
                      
                      {/* User status indicator for non-group chats */}
                      {!c.isGroup && c.participants.length > 0 && (
                        <div className="absolute -bottom-1 -right-1">
                          {(() => {
                            const otherUser = c.participants.find(p => p.userId !== user?.id);
                            if (otherUser) {
                              const status = userStatuses[otherUser.user.id];
                              if (status && (status === 'Online' || status === 'Away' || status === 'Busy' || status === 'Offline')) {
                                return (
                                  <UserStatusIndicator 
                                    status={status} 
                                    size="small" 
                                    showText={false}
                                  />
                                );
                              }
                              // Default to offline if no status
                              return (
                                <UserStatusIndicator 
                                  status="Offline" 
                                  size="small" 
                                  showText={false}
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>
                    
                    {/* Conversation details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium truncate transition-colors duration-200 text-gray-700">
                          {getDisplayName(c, user?.id)}
                        </h3>
                        {c.lastMessage && (
                          <span className="text-xs text-gray-500 transition-colors duration-200">
                            {formatLastMessageDate(c.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                         <p className="text-sm truncate max-w-[200px] text-gray-500 transition-colors duration-200">
                          {c.lastMessage ? (
                            <>
                                                             {getLastMessageSender(c.lastMessage.senderId, user, c)}
                               {c.lastMessage.senderId === user?.id ? ': ' : ': '}
                               {getLastMessagePreview(c.lastMessage.messageText)}
                            </>
                          ) : (
                            <span className="flex items-center gap-1">
                              {getParticipantIcon(c.isGroup)}
                              {getParticipantType(c.isGroup)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-col h-full bg-white overflow-hidden">
        {/* Header - Fixed */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
              {getAvatarLetter(active || undefined, user?.id)}
            </div>
                         <div>
               <h2 className="text-lg font-semibold text-gray-900">
                 {getDisplayName(active || undefined, user?.id)}
               </h2>
               {/* Other user's status indicator */}
               {getPatientStatus(active || undefined, user?.id, userStatuses) && (
                 <div className="flex items-center gap-2 mt-1">
                   <UserStatusIndicator 
                     status={getPatientStatus(active || undefined, user?.id, userStatuses)} 
                     size="small"
                     showText={false}
                   />
                 </div>
               )}
             </div>
          </div>
          
                                          <div className="flex items-center gap-2">
                       {/* Simple user status indicator */}
                       <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
                         <UserStatusIndicator 
                           status={user?.id ? (userStatuses[user.id] || 'Online') : 'Online'} 
                           size="small" 
                           showText={false}
                         />
                       </div>
                       
                       <button 
                         onClick={() => setMessageSearchExpanded(!messageSearchExpanded)}
                         className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                       >
                         <SearchIcon className="w-5 h-5" />
                       </button>
             
             {messageSearchExpanded && (
               <div className="relative animate-in slide-in-from-right duration-200">
                 <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                 <input
                   type="text"
                   placeholder="Search messages..."
                   className="w-80 pl-10 pr-4 py-2.5 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 bg-white shadow-lg transition-all duration-200"
                   autoFocus
                 />
                 <button 
                   onClick={() => setMessageSearchExpanded(false)}
                   className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
             )}
           </div>
        </div>

        {/* Messages Area - Scrollable */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
        >
          {/* Loading indicator for infinite scroll */}
          {loadingMore && (
            <div className="flex justify-center py-2">
              <CircularProgress size={20} />
            </div>
          )}
          
          {/* Group messages by date */}
          {(messages || []).reduce((groups: any[], message: any, index: number) => {
            const messageDate = getMessageGroupDate(message.createdAt);
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const prevMessageDate = prevMessage ? getMessageGroupDate(prevMessage.createdAt) : null;
            
            if (messageDate !== prevMessageDate) {
              groups.push(
                <div 
                  key={`date-${message.createdAt}`} 
                  className="flex justify-center my-6"
                >
                  <div className="bg-white px-4 py-2 rounded-full border border-gray-200 text-xs text-gray-500 font-medium shadow-sm">
                    {messageDate}
                  </div>
                </div>
              );
            }

            const mine = message.senderId === user?.id;
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
            const isFirstInGroup = !prevMessage || prevMessage.senderId !== message.senderId;
            const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;
            const showAvatar = isLastInGroup;
            const showTime = isLastInGroup;

            groups.push(
              <div 
                key={message.id} 
                className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${isFirstInGroup ? 'mt-4' : 'mt-1'} w-full`}
              >
                {/* Header with name and time */}
                {isFirstInGroup && (
                  <div
                    className={`flex items-center gap-2 mb-2 ${!mine ? 'ml-12' : 'mr-2'}`}
                  >
                    {!mine && (
                      <span className="text-sm font-medium text-gray-900">
                        {active?.participants.find(p => p.userId === message.senderId)?.user.displayName}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                )}

                <div 
                  className={`flex items-start gap-3 max-w-[70%] w-fit ${mine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar for non-mine messages */}
                  {!mine && (showAvatar ? (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium text-gray-700 mt-1 shadow-sm">
                      {getMessageSenderName(message.senderId, user, active || undefined)}
                    </div>
                  ) : (
                    <div className="w-8 h-8 invisible" />
                  ))}
                   
                  <div className="max-w-full min-w-[100px]">
                    <div 
                      className={`px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                        mine 
                          ? 'bg-blue-600 text-white rounded-br-md' 
                          : 'bg-white text-gray-900 rounded-bl-md border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed text-sm">
                        {message.messageText}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );

            return groups;
          }, [])}
          <div ref={endRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <MessageComposer 
            onSend={handleSend} 
            disabled={!active || sendingMessage} 
          />
          {sendingMessage && (
            <div className="mt-2 text-sm text-gray-500 flex items-center">
              <CircularProgress size={16} className="mr-2" />
              Sending...
            </div>
          )}
        </div>
          
          <div className="flex items-end gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            {/* Left side actions - File attachment */}
            <div className="flex gap-1">
              <Tooltip title="Attach file">
                <button 
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-105"
                  onClick={() => fileRef.current?.click()}
                >
                  <AttachFileIcon className="w-5 h-5" />
                </button>
              </Tooltip>
              <input 
                ref={fileRef} 
                type="file" 
                hidden 
                multiple 
                onChange={handleFileChange}
              />
            </div>

            {/* Message Composer */}
                         <MessageComposer 
               onSend={async (text) => {
                 if (!active || !text.trim()) return;
                 
                 try {
                   setSendingMessage(true);
                   console.log('Sending message:', text, 'to conversation:', active.id);
                   
                   // Send message via API
                   const result = await sendMessage(active.id, text);
                   console.log('Message sent successfully:', result);
                   
                   // Add message to local state immediately for better UX
                   const newMessage = {
                     id: result.message.id || `temp-${Date.now()}`,
                     senderId: user?.id || '',
                     messageText: text,
                     createdAt: new Date().toISOString()
                   };
                   
                   setMessages(prev => [...prev, newMessage]);
                   
                   // Update conversation list with latest message
                   setConversations(prev => prev.map(conv => {
                     if (conv.id === active.id) {
                       return {
                         ...conv,
                         lastMessage: {
                           id: newMessage.id,
                           senderId: newMessage.senderId,
                           messageText: newMessage.messageText,
                           createdAt: newMessage.createdAt,
                           read: true
                         },
                         unreadCount: 0
                       };
                     }
                     return conv;
                   }));
                   
                   // Emit user activity to update status to 'Online' if user was away/busy
                   if (user?.id) {
                     // Update local status and also update backend
                     try {
                       await userStatusService.updateUserStatus(user.id, 'online');
                       setUserStatuses(prev => ({
                         ...prev,
                         [user.id]: 'Online'
                       }));
                     } catch (error) {
                       console.error('Error updating user status:', error);
                       // Still update local state even if backend fails
                       setUserStatuses(prev => ({
                         ...prev,
                         [user.id]: 'Online'
                       }));
                     }
                   }
                   
                   // Scroll to bottom for new messages
                   setTimeout(() => {
                     endRef.current?.scrollIntoView({ behavior: 'smooth' });
                   }, 10);
                   
                 } catch (e: any) {
                   console.error('Failed to send message:', e);
                   toast.error(e.message || 'Failed to send message. Please try again.');
                   
                   // If it's a network error, try to reconnect socket
                   if (e.message?.includes('Network error') && socket && !socketConnected) {
                     console.log('Attempting to reconnect socket...');
                     socket.connect();
                   }
                 } finally {
                   setSendingMessage(false);
                 }
               }}
               disabled={sendingMessage || !socketConnected}
               sx={{
                 flex: 1,
                 '& .MuiInputBase-root': {
                   bgcolor: 'transparent',
                   border: 'none',
                   '&:hover': {
                     bgcolor: 'transparent'
                   },
                   '&.Mui-focused': {
                     bgcolor: 'transparent'
                   }
                 }
               }}
             />

            {/* Right side actions - Emoji, Schedule, Send */}
            <div className="flex gap-1">
              <Tooltip title="Add emoji">
                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-105">
                  <EmojiEmotionsIcon className="w-5 h-5" />
                </button>
              </Tooltip>
              <Tooltip title="Schedule message">
                <button 
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-105"
                  onClick={(e) => setScheduleAnchor(e.currentTarget)}
                >
                  <ScheduleSend className="w-5 h-5" />
                </button>
              </Tooltip>
              <Tooltip title="Send message">
                <button 
                  className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                    sendingMessage 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
                  disabled={sendingMessage}
                >
                  <SendIcon className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Start chat dialog */}
      <Dialog open={startOpen} onClose={() => setStartOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start a chat</DialogTitle>
        <DialogContent>
          <div className="flex items-center gap-2 mb-4">
            <SearchIcon fontSize="small" className="text-gray-400" />
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
          </div>
          <List>
            {memberResults.filter(m => m.id !== user?.id).map((m) => (
              <ListItem key={m.id} secondaryAction={
                <Button size="small" variant="contained" disabled={creating} onClick={async () => {
                  try {
                    setCreating(true);
                    // Check if a direct conversation already exists with this user
                    const existingConv = conversations.find(c => 
                      !c.isGroup && 
                      c.name.includes(m.displayName) && 
                      c.name.includes(user?.displayName || 'You')
                    );
                     
                    if (existingConv) {
                      // Use existing conversation
                      setActive(existingConv);
                      setStartOpen(false);
                      return;
                    }

                    // Create new conversation if none exists
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

      {/* Socket.IO Debugger for development */}
      {process.env.NODE_ENV === 'development' && <SocketDebugger />}
    </div>
  );
};

export default ChatPanel;


