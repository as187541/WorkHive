import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const MessageBadge = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

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
    const interval = setInterval(fetchCount, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

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
