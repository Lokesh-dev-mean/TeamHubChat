# User Status System

The User Status System provides real-time presence indicators for users in the TeamHub platform, allowing users to see when others are online, away, busy, or offline.

## Features

- **Real-time Status Updates**: Users can see live status changes via WebSocket
- **Multiple Status Types**: Online, Away, Busy, Offline
- **Automatic Status Management**: Status updates automatically based on user activity
- **Last Seen Tracking**: Records when users were last active
- **Conversation-based Status**: Shows status for conversation participants

## Status Types

| Status | Description | When Set |
|--------|-------------|----------|
| `online` | User is actively using the platform | When user connects, sends messages, or performs actions |
| `away` | User is away from keyboard | When user manually sets status or is inactive for extended period |
| `busy` | User is busy/do not disturb | When user manually sets status |
| `offline` | User is not connected | When user disconnects or is inactive |

## Database Schema

The system uses existing fields in the `User` model:

```prisma
model User {
  // ... other fields
  onlineStatus String @default("offline")  // Current status
  lastSeenAt  DateTime?                   // Last activity timestamp
}
```

## API Endpoints

### Get User Status
```
GET /api/user-status/:userId
```
Returns the current status of a specific user.

### Update User Status
```
PUT /api/user-status/:userId
Body: { "status": "busy" }
```
Updates the status of the authenticated user.

### Get Online Users
```
GET /api/user-status/online/:tenantId
```
Returns all online users in a specific tenant.

### Get Users by Status
```
GET /api/user-status/status/:tenantId/:status
```
Returns users with a specific status in a tenant.

### Get Conversation Participants with Status
```
GET /api/user-status/conversation/:conversationId/participants
```
Returns conversation participants with their current statuses.

## WebSocket Events

### Client to Server Events

#### `update-status`
Updates the user's status.
```javascript
socket.emit('update-status', 'busy');
```

#### `user-activity`
Indicates user activity (automatically sent when sending messages).
```javascript
socket.emit('user-activity');
```

### Server to Client Events

#### `user-status-change`
Notifies when a user's status changes.
```javascript
socket.on('user-status-change', (data) => {
  console.log(`User ${data.userId} is now ${data.status}`);
});
```

#### `user-online`
Notifies when a user comes online in a conversation.
```javascript
socket.on('user-online', (data) => {
  console.log(`User ${data.displayName} is online in conversation ${data.conversationId}`);
});
```

#### `user-offline`
Notifies when a user goes offline in a conversation.
```javascript
socket.on('user-offline', (data) => {
  console.log(`User ${data.userId} went offline from conversation ${data.conversationId}`);
});
```

## Automatic Status Updates

The system automatically updates user status based on various events:

1. **Connection**: Status set to `online` when user connects
2. **Message Sending**: Status set to `online` when user sends a message
3. **Disconnection**: Status set to `offline` when user disconnects
4. **Manual Updates**: Users can manually set their status via API or UI

## Frontend Integration

### Status Display
```typescript
// Get user status from conversation participants
const getPatientStatus = (conversation, userId, userStatuses) => {
  if (!conversation || !userId) return '';
  if (conversation.isGroup) return '';
  
  const otherUser = conversation.participants?.find(p => p.userId !== userId)?.user;
  if (!otherUser) return '';
  
  return otherUser.status || 'Offline';
};
```

### Real-time Updates
```typescript
// Listen for status changes
useEffect(() => {
  if (!socket) return;
  
  socket.on('user-status-change', (data) => {
    setUserStatuses(prev => ({
      ...prev,
      [data.userId]: data.status
    }));
  });
  
  return () => {
    socket.off('user-status-change');
  };
}, [socket]);
```

## Testing

Run the test script to verify the system:

```bash
cd backend
node test-status.js
```

This will test:
- User status retrieval
- Status updates
- Status filtering
- Conversation participant statuses

## Security

- Users can only update their own status
- Status information is restricted to tenant members
- WebSocket connections require valid authentication tokens
- All API endpoints require authentication

## Performance Considerations

- Status updates are batched and sent via WebSocket for real-time updates
- Database queries are optimized with proper indexing
- Status information is cached in memory for active users
- Inactive users are automatically marked as offline after timeout

## Future Enhancements

- **Typing Indicators**: Show when users are typing
- **Status Messages**: Allow custom status messages (e.g., "In a meeting")
- **Status Scheduling**: Set status changes for specific times
- **Mobile Presence**: Detect mobile vs desktop usage
- **Status History**: Track status changes over time
