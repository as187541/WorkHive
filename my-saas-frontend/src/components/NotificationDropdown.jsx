import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiClock, FiCheckSquare, FiUserPlus, FiFolder, FiGift, FiX } from 'react-icons/fi';
import api from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { ACTION_CONFIG, formatTimeAgo } from '../hooks/useActivityData';

const NOTIFICATION_ACTIONS = [
  'task_created', 'task_assigned', 'task_completed',
  'hire_sent', 'hire_accepted', 'hire_rejected',
  'workspace_joined', 'workspace_created',
  'project_created', 'project_joined',
  'redemption_approved', 'redemption_denied',
  'proposal_submitted', 'proposal_accepted', 'proposal_rejected'
];

const NOTIFICATION_ROUTES = {
  task_created: '/my-tasks',
  task_assigned: '/my-tasks',
  task_completed: '/my-tasks',
  hire_sent: '/hire-invitations',
  hire_accepted: '/hire-invitations',
  hire_rejected: '/hire-invitations',
  workspace_joined: '/workspaces',
  workspace_created: '/workspaces',
  project_created: '/workspaces',
  project_joined: '/workspaces',
  redemption_approved: '/rewards',
  redemption_denied: '/rewards',
  proposal_submitted: '/my-proposals',
  proposal_accepted: '/my-proposals',
  proposal_rejected: '/my-proposals'
};

const NotificationDropdown = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { socket } = useSocket();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: 15 });
      NOTIFICATION_ACTIONS.forEach(action => params.append('action', action));
      const res = await api.get(`/activities?${params.toString()}`);
      const data = res.data.data || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !isRead(n)).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const isRead = (notification) => {
    const readKey = `notif_read_${notification._id}`;
    return localStorage.getItem(readKey) === 'true';
  };

  const markAsRead = (notification) => {
    const readKey = `notif_read_${notification._id}`;
    localStorage.setItem(readKey, 'true');
    setUnreadCount(prev => Math.max(0, prev - 1));
    setNotifications(prev => prev.map(n =>
      n._id === notification._id ? { ...n, _read: true } : n
    ));
  };

  const markAllAsRead = () => {
    notifications.forEach(n => {
      const readKey = `notif_read_${n._id}`;
      localStorage.setItem(readKey, 'true');
    });
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, _read: true })));
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification);
    setIsOpen(false);
    const route = NOTIFICATION_ROUTES[notification.action];
    if (route) navigate(route);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = () => {
      fetchNotifications();
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('hire:invitation', handleNewNotification);
    socket.on('redemption:new', handleNewNotification);
    socket.on('task:updated', handleNewNotification);
    socket.on('proposal:status_changed', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('hire:invitation', handleNewNotification);
      socket.off('redemption:new', handleNewNotification);
      socket.off('task:updated', handleNewNotification);
      socket.off('proposal:status_changed', handleNewNotification);
    };
  }, [socket]);

  // Refresh count periodically
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className="notification-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="notification-mark-all"
                onClick={markAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-dropdown-list">
            {loading ? (
              <div className="notification-loading">
                <div className="spinner" style={{ width: 24, height: 24 }}></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <FiBell size={24} style={{ opacity: 0.4 }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => {
                const config = ACTION_CONFIG[notification.action] || {
                  label: notification.action,
                  icon: 'FiClock',
                  color: '#6b7280',
                  bg: '#f3f4f6'
                };
                const read = isRead(notification);

                return (
                  <div
                    key={notification._id}
                    className={`notification-item ${read ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div
                      className="notification-item-icon"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      <FiClock size={14} />
                    </div>
                    <div className="notification-item-content">
                      <p>
                        <strong>{notification.user?.name || 'Someone'}</strong>{' '}
                        {config.label}{' '}
                        <strong>{notification.target}</strong>
                      </p>
                      <span className="notification-item-meta">
                        {notification.workspace?.name && (
                          <span className="notification-item-workspace">
                            {notification.workspace.name}
                          </span>
                        )}
                        <span className="notification-item-time">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </span>
                    </div>
                    {!read && <div className="notification-unread-dot"></div>}
                  </div>
                );
              })
            )}
          </div>

          <div className="notification-dropdown-footer">
            <button onClick={() => { setIsOpen(false); navigate('/activity-log'); }}>
              View All Activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;