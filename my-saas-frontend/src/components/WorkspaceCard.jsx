// src/components/WorkspaceCard.jsx
import React from 'react';

const WorkspaceCard = ({ workspace, onInviteClick }) => {
  return (
    <div className="workspace-card">
      <div className="card-content">
        <h3>{workspace.name}</h3>
        <p>{workspace.description || 'No description provided.'}</p>
      </div>
      <div className="card-actions">
        <button className="btn btn-secondary" onClick={() => onInviteClick(workspace)}>
          Invite
        </button>
      </div>
    </div>
  );
};
export default WorkspaceCard;