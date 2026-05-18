import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../contexts/SocketContext';

const ConnectionBadge = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [count, setCount] = useState(0);

  const fetchPendingRequests = async () => {
    try {
      const res = await api.get('/connections/requests');
      setCount(res.data.count || (res.data.data?.length || 0));
    } catch (err) {
      console.error('Failed to fetch pending connection requests:', err);
      setCount(0);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (payload) => {
      if (!payload?.type) return;
      if (payload.type === 'connection_request') {
        fetchPendingRequests();
      }
    };

    socket.on('notification:new', handleNotification);
    socket.on('connection:request', fetchPendingRequests);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('connection:request', fetchPendingRequests);
    };
  }, [socket]);

  return (
    <button
      className="message-badge-btn"
      onClick={() => navigate('/connections')}
      title="Pending Connection Requests"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      {count > 0 && (
        <span className="message-badge-count">{count > 99 ? '99+' : count}</span>
      )}
    </button>
  );
};

export default ConnectionBadge;
