import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiUserPlus, FiCheck, FiX, FiSearch, FiMessageSquare, FiUsers, FiClock, FiSend } from 'react-icons/fi';

const ConnectionsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('connections');
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [connRes, reqRes, sentRes] = await Promise.allSettled([
        api.get('/connections'),
        api.get('/connections/requests'),
        api.get('/connections/sent')
      ]);
      if (connRes.status === 'fulfilled') setConnections(connRes.value.data.data || []);
      if (reqRes.status === 'fulfilled') setPendingRequests(reqRes.value.data.data || []);
      if (sentRes.status === 'fulfilled') setSentRequests(sentRes.value.data.data || []);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (connectionId) => {
    setActionLoading(prev => ({ ...prev, [connectionId]: true }));
    try {
      await api.put(`/connections/${connectionId}/accept`);
      // Move from pending to connections
      const accepted = pendingRequests.find(r => r._id === connectionId);
      setPendingRequests(prev => prev.filter(r => r._id !== connectionId));
      if (accepted) {
        const friend = accepted.requester;
        setConnections(prev => [{ connectionId: accepted._id, friend, connectedAt: new Date() }, ...prev]);
      }
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to accept request');
    } finally {
      setActionLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleDecline = async (connectionId) => {
    setActionLoading(prev => ({ ...prev, [connectionId]: true }));
    try {
      await api.put(`/connections/${connectionId}/decline`);
      setPendingRequests(prev => prev.filter(r => r._id !== connectionId));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to decline request');
    } finally {
      setActionLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleRemove = async (connectionId) => {
    if (!window.confirm('Remove this connection?')) return;
    setActionLoading(prev => ({ ...prev, [connectionId]: true }));
    try {
      await api.delete(`/connections/${connectionId}`);
      setConnections(prev => prev.filter(c => c.connectionId !== connectionId));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to remove connection');
    } finally {
      setActionLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleMessage = (userId) => {
    navigate(`/messages?user=${userId}`);
  };

  const filteredConnections = searchQuery
    ? connections.filter(c =>
        c.friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.friend.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : connections;

  const tabs = [
    { key: 'connections', label: 'Connections', icon: FiUsers, count: connections.length },
    { key: 'pending', label: 'Pending', icon: FiClock, count: pendingRequests.length },
    { key: 'sent', label: 'Sent', icon: FiSend, count: sentRequests.length }
  ];

  return (
    <div className="connections-page page-enter">
      <div className="connections-header">
        <h1><FiUsers /> My Connections</h1>
        <p>Manage your professional network</p>
      </div>

      <div className="connections-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`connections-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'connections' && (
        <div className="connections-search">
          <FiSearch size={18} />
          <input
            type="text"
            placeholder="Search connections by name or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="loading-state"><div className="spinner"></div></div>
      ) : (
        <>
          {/* Connections Tab */}
          {activeTab === 'connections' && (
            <div className="connections-list">
              {filteredConnections.length === 0 ? (
                <div className="empty-state">
                  <FiUsers size={48} />
                  <h3>{searchQuery ? 'No connections found' : 'No connections yet'}</h3>
                  <p>{searchQuery ? 'Try a different search term' : 'Visit the Talent Marketplace to find and connect with professionals'}</p>
                  {!searchQuery && (
                    <button className="btn btn-primary" onClick={() => navigate('/talent')}>
                      Browse Talent
                    </button>
                  )}
                </div>
              ) : (
                filteredConnections.map(conn => (
                  <div key={conn.connectionId} className="connection-card">
                    <div className="connection-avatar" onClick={() => navigate(`/talent/${conn.friend._id}`)}>
                      {conn.friend.avatar ? (
                        <img src={conn.friend.avatar} alt={conn.friend.name} />
                      ) : (
                        <div className="avatar-placeholder-lg">
                          {conn.friend.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="connection-info" onClick={() => navigate(`/talent/${conn.friend._id}`)}>
                      <h4>{conn.friend.name}</h4>
                      <p className="connection-bio">{conn.friend.bio?.substring(0, 80) || 'No bio'}</p>
                      {conn.friend.skills?.length > 0 && (
                        <div className="connection-skills">
                          {conn.friend.skills.slice(0, 4).map((skill, i) => (
                            <span key={i} className="skill-tag">{skill}</span>
                          ))}
                          {conn.friend.skills.length > 4 && (
                            <span className="skill-tag more">+{conn.friend.skills.length - 4}</span>
                          )}
                        </div>
                      )}
                      <span className="connection-date">
                        Connected {new Date(conn.connectedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="connection-actions">
                      <button
                        className="btn btn-icon"
                        onClick={() => handleMessage(conn.friend._id)}
                        title="Send message"
                      >
                        <FiMessageSquare size={18} />
                      </button>
                      <button
                        className="btn btn-icon btn-danger-outline"
                        onClick={() => handleRemove(conn.connectionId)}
                        disabled={actionLoading[conn.connectionId]}
                        title="Remove connection"
                      >
                        <FiX size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pending Requests Tab */}
          {activeTab === 'pending' && (
            <div className="connections-list">
              {pendingRequests.length === 0 ? (
                <div className="empty-state">
                  <FiClock size={48} />
                  <h3>No pending requests</h3>
                  <p>When someone sends you a connection request, it will appear here</p>
                </div>
              ) : (
                pendingRequests.map(req => (
                  <div key={req._id} className="connection-card">
                    <div className="connection-avatar" onClick={() => navigate(`/talent/${req.requester._id}`)}>
                      {req.requester.avatar ? (
                        <img src={req.requester.avatar} alt={req.requester.name} />
                      ) : (
                        <div className="avatar-placeholder-lg">
                          {req.requester.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="connection-info" onClick={() => navigate(`/talent/${req.requester._id}`)}>
                      <h4>{req.requester.name}</h4>
                      <p className="connection-bio">{req.requester.bio?.substring(0, 80) || 'No bio'}</p>
                      {req.requester.skills?.length > 0 && (
                        <div className="connection-skills">
                          {req.requester.skills.slice(0, 4).map((skill, i) => (
                            <span key={i} className="skill-tag">{skill}</span>
                          ))}
                        </div>
                      )}
                      <span className="connection-date">
                        Requested {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="connection-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAccept(req._id)}
                        disabled={actionLoading[req._id]}
                      >
                        <FiCheck size={16} /> Accept
                      </button>
                      <button
                        className="btn btn-danger-outline btn-sm"
                        onClick={() => handleDecline(req._id)}
                        disabled={actionLoading[req._id]}
                      >
                        <FiX size={16} /> Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sent Requests Tab */}
          {activeTab === 'sent' && (
            <div className="connections-list">
              {sentRequests.length === 0 ? (
                <div className="empty-state">
                  <FiSend size={48} />
                  <h3>No sent requests</h3>
                  <p>When you send connection requests, they will appear here</p>
                </div>
              ) : (
                sentRequests.map(req => (
                  <div key={req._id} className="connection-card">
                    <div className="connection-avatar" onClick={() => navigate(`/talent/${req.recipient._id}`)}>
                      {req.recipient.avatar ? (
                        <img src={req.recipient.avatar} alt={req.recipient.name} />
                      ) : (
                        <div className="avatar-placeholder-lg">
                          {req.recipient.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="connection-info" onClick={() => navigate(`/talent/${req.recipient._id}`)}>
                      <h4>{req.recipient.name}</h4>
                      <p className="connection-bio">{req.recipient.bio?.substring(0, 80) || 'No bio'}</p>
                      <span className="connection-date pending-badge">
                        <FiClock size={12} /> Pending · Sent {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConnectionsPage;