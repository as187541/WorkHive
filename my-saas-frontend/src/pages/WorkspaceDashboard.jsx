// my-saas-frontend/src/pages/WorkspaceDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiPlus, FiSearch } from 'react-icons/fi';
import WorkspaceCard from '../components/WorkspaceCard';
import api from '../services/api';

const WorkspaceDashboard = () => {
  const context = useOutletContext();
  const workspaces = context?.workspaces || [];
  const openCreateModal = context?.openCreateModal;
  const [invitations, setInvitations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    api.get('/workspaces/invitations/me')
      .then(res => setInvitations(res.data))
      .catch(err => console.error("Could not fetch invitations"));
  }, []);

  const handleAccept = async (id) => {
    try {
      await api.post(`/workspaces/invitations/${id}/accept`);
      setInvitations(invitations.filter(i => i._id !== id));
      window.location.reload();
    } catch (err) {
      alert("Failed to join workspace.");
    }
  };

  const filteredWorkspaces = workspaces.filter(ws => {
    const matchesSearch = ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ws.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' ? true :
      activeTab === 'active' ? ws.status === 'active' :
      activeTab === 'archived' ? ws.status === 'archived' : true;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="workspaces-page">
      {/* Invitations Banner */}
      {invitations.length > 0 && (
        <div className="invitations-banner">
          <h3>📩 Pending Invitations</h3>
          {invitations.map(invite => (
            <div key={invite._id} className="invite-item">
              <p>
                <strong>{invite.sender?.name}</strong> invited you to <strong>{invite.workspace?.name}</strong>
              </p>
              <button onClick={() => handleAccept(invite._id)} className="btn-accept">Accept</button>
            </div>
          ))}
        </div>
      )}

      {/* Page Header */}
      <header className="page-header">
        <div>
          <h1>Workspaces</h1>
          <p className="page-description">Manage your collaborative projects</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <FiPlus style={{ marginRight: '6px' }} /> Create Workspace
        </button>
      </header>

      {/* Search & Tabs */}
      <div className="workspaces-toolbar">
        <div className="search-bar-wrapper">
          <FiSearch className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-bar"
          />
        </div>

        <div className="tabs">
          {['all', 'active', 'archived'].map(tab => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Workspaces
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="content-grid">
        {filteredWorkspaces.length > 0 ? (
          filteredWorkspaces.map(ws => (
            <WorkspaceCard key={ws._id} workspace={ws} />
          ))
        ) : (
          <div className="empty-state">
            <p>No workspaces found. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceDashboard;