import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const HireNotificationBadge = () => {
  const navigate = useNavigate();
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
    const interval = setInterval(fetchCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

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
