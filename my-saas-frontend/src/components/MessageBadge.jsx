import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../contexts/SocketContext';

const MessageBadge = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [count, setCount] = useState(0);

  // Initial fetch + socket updates
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get('/messages/unread-count');
        setCount(res.data.count || 0);
      } catch {
        setCount(0);
      }
    };

    fetchCount();

    if (!socket) return;

    // Listen for unread count updates from socket
    socket.on('unread_count', (data) => {
      // Refresh total unread count when any conversation updates
      fetchCount();
    });

    // Listen for new messages to update badge
    socket.on('new_message', () => {
      fetchCount();
    });

    return () => {
      socket.off('unread_count');
      socket.off('new_message');
    };
  }, [socket]);

  return (
    <button
      className="message-badge-btn"
      onClick={() => navigate('/messages')}
      title="Messages"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      {count > 0 && (
        <span className="message-badge-count">{count > 99 ? '99+' : count}</span>
      )}
    </button>
  );
};

export default MessageBadge;
