import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Helper functions
  const joinConversation = (conversationId) => {
    socket?.emit('join_conversation', { conversationId });
  };

  const leaveConversation = (conversationId) => {
    socket?.emit('leave_conversation', { conversationId });
  };

  const joinWorkspace = (workspaceId) => {
    socket?.emit('join_workspace', { workspaceId });
  };

  const leaveWorkspace = (workspaceId) => {
    socket?.emit('leave_workspace', { workspaceId });
  };

  const joinProject = (projectId) => {
    socket?.emit('join_project', { projectId });
  };

  const sendTyping = (conversationId) => {
    socket?.emit('typing', { conversationId });
  };

  const stopTyping = (conversationId) => {
    socket?.emit('stop_typing', { conversationId });
  };

  const value = {
    socket,
    connected,
    joinConversation,
    leaveConversation,
    joinWorkspace,
    leaveWorkspace,
    joinProject,
    sendTyping,
    stopTyping
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
