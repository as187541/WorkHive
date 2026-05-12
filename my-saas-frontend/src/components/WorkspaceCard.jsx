// src/components/WorkspaceCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiCheckSquare, FiMoreVertical } from 'react-icons/fi';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

const WorkspaceCard = ({ workspace }) => {
  const navigate = useNavigate();
  const colorIndex = workspace.name.length % COLORS.length;
  const color = workspace.color || COLORS[colorIndex];

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `Updated ${hours} hours ago`;
    if (days === 1) return 'Updated 1 day ago';
    return `Updated ${days} days ago`;
  };

  return (
    <div
      className="workspace-card clickable-card"
      onClick={() => navigate(`/workspaces/${workspace._id}`)}
    >
      <div className="card-content">
        <div className="workspace-card-header">
          <div
            className="workspace-avatar"
            style={{ backgroundColor: color }}
          >
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <div className="workspace-card-meta">
            <h3>{workspace.name}</h3>
            <span className={`status-badge ${workspace.status || 'active'}`}>
              {workspace.status || 'active'}
            </span>
          </div>
          <button
            className="workspace-menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: open dropdown menu
            }}
          >
            <FiMoreVertical size={16} />
          </button>
        </div>

        <p className="workspace-description">
          {workspace.description || 'Collaborative design projects and prototypes'}
        </p>

        <div className="workspace-stats">
          <div className="workspace-stat">
            <FiUsers size={14} />
            <span>{workspace.members?.length || 0}</span>
          </div>
          <div className="workspace-stat">
            <FiCheckSquare size={14} />
            <span>{workspace.taskCount ?? 0} tasks</span>
          </div>
        </div>

        <div className="workspace-footer">
          <span className="workspace-updated">{formatTimeAgo(workspace.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceCard;