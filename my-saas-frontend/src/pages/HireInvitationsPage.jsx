import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './HireInvitationsPage.css';
const HireInvitationsPage = () => {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [activeTab, setActiveTab] = useState('received');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const [receivedRes, sentRes] = await Promise.all([
        api.get('/hires/received'),
        api.get('/hires/sent')
      ]);
      setReceived(receivedRes.data.data || []);
      setSent(sentRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (hireId) => {
    try {
      setActionLoading(hireId);
      await api.patch(`/hires/${hireId}/accept`);
      setReceived(prev => prev.filter(inv => inv._id !== hireId));
      alert('Invitation accepted! You have joined the workspace.');
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to accept invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (hireId) => {
    if (!window.confirm('Are you sure you want to reject this invitation?')) return;
    try {
      setActionLoading(hireId);
      await api.patch(`/hires/${hireId}/reject`);
      setReceived(prev => prev.filter(inv => inv._id !== hireId));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to reject invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (hireId) => {
    if (!window.confirm('Are you sure you want to cancel this invitation?')) return;
    try {
      setActionLoading(hireId);
      await api.delete(`/hires/${hireId}`);
      setSent(prev => prev.filter(inv => inv._id !== hireId));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to cancel invitation');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="hire-invitations-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading invitations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hire-invitations-page">
        <div className="error-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button onClick={fetchInvitations} className="btn-retry">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="hire-invitations-page page-enter">
      <header className="page-header">
        <div>
          <h1>Hire Invitations</h1>
          <p className="page-description">Manage your hire invitations</p>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent
        </button>
        <button
          className={`tab ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          Received
        </button>
      </div>

      {activeTab === 'sent' && (
        <div className="invitations-list">
          {sent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📤</div>
              <h3>No invitations sent</h3>
              <p>Browse the talent marketplace and send hire invitations.</p>
            </div>
          ) : (
            sent.map(inv => (
              <div key={inv._id} className="hire-invitation-card">
                <div className="hire-invitation-info">
                  <div className="hire-invitation-avatar">
                    {inv.invitedUser?.avatar ? (
                      <img src={inv.invitedUser.avatar} alt={inv.invitedUser.name} />
                    ) : (
                      <div className="hire-avatar-placeholder">
                        {inv.invitedUser?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="hire-invitation-details">
                    <h3>{inv.invitedUser?.name}</h3>
                    <p className="hire-role">{inv.role || 'Freelancer'}</p>
                    <p className="hire-project">Project: {inv.workspace?.name}</p>
                    <span className={`hire-status-badge ${inv.status.toLowerCase()}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
                <div className="hire-invitation-actions">
                  <span className="hire-rate">${inv.hourlyRate || 85}/hr</span>
                  {inv.status === 'Pending' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCancel(inv._id)}
                      disabled={actionLoading === inv._id}
                    >
                      {actionLoading === inv._id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'received' && (
        <div className="invitations-list">
          {received.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>No pending invitations</h3>
              <p>When someone invites you, it will appear here.</p>
            </div>
          ) : (
            received.map(inv => (
              <div key={inv._id} className="hire-invitation-card">
                <div className="hire-invitation-info">
                  <div className="hire-invitation-avatar">
                    {inv.sender?.avatar ? (
                      <img src={inv.sender.avatar} alt={inv.sender.name} />
                    ) : (
                      <div className="hire-avatar-placeholder">
                        {inv.sender?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="hire-invitation-details">
                    <h3>{inv.sender?.name}</h3>
                    <p className="hire-role">{inv.role || 'Freelancer'}</p>
                    <p className="hire-project">Project: {inv.workspace?.name}</p>
                    <span className={`hire-status-badge ${inv.status.toLowerCase()}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
                <div className="hire-invitation-actions">
                  <span className="hire-rate">${inv.hourlyRate || 85}/hr</span>
                  {inv.status === 'Pending' && (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAccept(inv._id)}
                        disabled={actionLoading === inv._id}
                      >
                        {actionLoading === inv._id ? 'Processing...' : 'Accept'}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleReject(inv._id)}
                        disabled={actionLoading === inv._id}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HireInvitationsPage;
