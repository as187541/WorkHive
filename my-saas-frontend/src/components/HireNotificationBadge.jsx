import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../contexts/SocketContext';

const HireNotificationBadge = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get('/hires/received');
        setCount(res.data.count || 0);
      } catch {
        setCount(0);
      }
    };

    fetchCount();

    if (!socket) return;

    // Listen for new hire invitations via socket
    socket.on('hire:invitation', () => {
      setCount(prev => prev + 1);
    });

    return () => {
      socket.off('hire:invitation');
    };
  }, [socket]);

  if (count === 0) return null;

  return (
    <button
      className="hire-notification-badge"
      onClick={() => navigate('/hire-invitations')}
      title="You have pending hire invitations"
    >
      <span className="badge-icon">📩</span>
      <span className="badge-count">{count}</span>
    </button>
  );
};

export default HireNotificationBadge;
