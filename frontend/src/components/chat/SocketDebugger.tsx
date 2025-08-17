import React, { useEffect, useState } from 'react';
import { io as createSocket } from 'socket.io-client';

interface SocketStatus {
  connected: boolean;
  error: string | null;
  events: Array<{ type: string; data: any; timestamp: string }>;
}

const SocketDebugger: React.FC = () => {
  const [socketStatus, setSocketStatus] = useState<SocketStatus>({
    connected: false,
    error: null,
    events: []
  });

  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api$/, '');
    
    console.log('🔍 SocketDebugger: Connecting to Socket.IO at:', apiBase);
    
    const newSocket = createSocket(apiBase, { 
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔌 SocketDebugger: Connected');
      setSocketStatus(prev => ({
        ...prev,
        connected: true,
        error: null,
        events: [...prev.events, {
          type: 'connect',
          data: { id: newSocket.id },
          timestamp: new Date().toISOString()
        }]
      }));
      
      // Join conversations
      newSocket.emit('join-conversations');
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('❌ SocketDebugger: Connection error:', error);
      setSocketStatus(prev => ({
        ...prev,
        connected: false,
        error: error.message,
        events: [...prev.events, {
          type: 'connect_error',
          data: error,
          timestamp: new Date().toISOString()
        }]
      }));
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('🔌 SocketDebugger: Disconnected:', reason);
      setSocketStatus(prev => ({
        ...prev,
        connected: false,
        events: [...prev.events, {
          type: 'disconnect',
          data: { reason },
          timestamp: new Date().toISOString()
        }]
      }));
    });

    newSocket.on('reconnect', (attemptNumber: number) => {
      console.log('🔌 SocketDebugger: Reconnected after', attemptNumber, 'attempts');
      setSocketStatus(prev => ({
        ...prev,
        connected: true,
        events: [...prev.events, {
          type: 'reconnect',
          data: { attemptNumber },
          timestamp: new Date().toISOString()
        }]
      }));
    });

    // Message events
    newSocket.on('new-message', (payload: any) => {
      console.log('📨 SocketDebugger: New message received:', payload);
      setSocketStatus(prev => ({
        ...prev,
        events: [...prev.events, {
          type: 'new-message',
          data: payload,
          timestamp: new Date().toISOString()
        }]
      }));
    });

    newSocket.on('user-status-change', (payload: any) => {
      console.log('👤 SocketDebugger: User status change:', payload);
      setSocketStatus(prev => ({
        ...prev,
        events: [...prev.events, {
          type: 'user-status-change',
          data: payload,
          timestamp: new Date().toISOString()
        }]
      }));
    });

    newSocket.on('user-online', (payload: any) => {
      console.log('🟢 SocketDebugger: User online:', payload);
      setSocketStatus(prev => ({
        ...prev,
        events: [...prev.events, {
          type: 'user-online',
          data: payload,
          timestamp: new Date().toISOString()
        }]
      }));
    });

    newSocket.on('user-offline', (payload: any) => {
      console.log('🔴 SocketDebugger: User offline:', payload);
      setSocketStatus(prev => ({
        ...prev,
        events: [...prev.events, {
          type: 'user-offline',
          data: payload,
          timestamp: new Date().toISOString()
        }]
      }));
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const clearEvents = () => {
    setSocketStatus(prev => ({ ...prev, events: [] }));
  };

  const testEmit = () => {
    if (socket && socketStatus.connected) {
      socket.emit('test-event', { message: 'Test from debugger', timestamp: new Date().toISOString() });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-h-96 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Socket.IO Debugger</h3>
        <div className="flex gap-2">
          <button
            onClick={clearEvents}
            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
          >
            Clear
          </button>
          <button
            onClick={testEmit}
            disabled={!socketStatus.connected}
            className="px-2 py-1 text-xs bg-blue-200 hover:bg-blue-300 rounded disabled:opacity-50"
          >
            Test
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${socketStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs font-medium">
            {socketStatus.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {socketStatus.error && (
          <p className="text-xs text-red-600 mt-1">{socketStatus.error}</p>
        )}
      </div>

      {/* Events Log */}
      <div className="text-xs">
        <div className="font-medium mb-2">Events ({socketStatus.events.length})</div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {socketStatus.events.slice(-10).map((event, index) => (
            <div key={index} className="p-2 bg-gray-50 rounded border">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-blue-600">{event.type}</span>
                <span className="text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className="text-xs text-gray-700 overflow-x-auto">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocketDebugger;
