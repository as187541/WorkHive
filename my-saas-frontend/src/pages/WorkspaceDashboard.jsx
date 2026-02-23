// my-saas-frontend/src/pages/WorkspaceDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import WorkspaceCard from '../components/WorkspaceCard';
import api from '../services/api';

const WorkspaceDashboard = () => {
  // Use a fallback to prevent "undefined" errors
  const context = useOutletContext();
  const workspaces = context?.workspaces || []; 
  
  const [invitations, setInvitations] = useState([]);

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

  return (
    <div className="dashboard-container">
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

      <header className="page-header">
        <h1>My Workspaces</h1>
      </header>

      <div className="content-grid">
        {workspaces.length > 0 ? (
          workspaces.map(ws => (
            <WorkspaceCard key={ws._id} workspace={ws} onInviteClick={() => {}} />
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