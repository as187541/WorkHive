// src/components/WorkspaceCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const WorkspaceCard = ({ workspace }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="workspace-card clickable-card" 
      onClick={() => navigate(`/workspaces/${workspace._id}`)}
    >
      <div className="card-content">
        <div className="card-icon">🗂️</div>
        <h3>{workspace.name}</h3>
        <p>{workspace.description || 'No description provided.'}</p>
      </div>
      
      <div className="card-footer-stats">
        <span>{workspace.members?.length || 0} Members</span>
        <span className="arrow-icon">→</span>
      </div>
    </div>
  );
};

export default WorkspaceCard;