import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FiFilter, FiClock, FiCheckSquare, FiUserPlus, FiFolder,
  FiMessageSquare, FiFileText, FiArrowRight, FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import api from '../services/api';

const ACTION_CONFIG = {
  task_created: { label: 'Created task', icon: FiFileText, color: '#3b82f6', bg: '#eff6ff' },
  task_updated: { label: 'Updated task', icon: FiCheckSquare, color: '#f59e0b', bg: '#fffbeb' },
  task_completed: { label: 'Completed task', icon: FiCheckSquare, color: '#10b981', bg: '#ecfdf5' },
  task_assigned: { label: 'Assigned task', icon: FiUserPlus, color: '#8b5cf6', bg: '#f5f3ff' },
  hire_sent: { label: 'Sent hire invitation', icon: FiUserPlus, color: '#3b82f6', bg: '#eff6ff' },
  hire_accepted: { label: 'Accepted hire invitation', icon: FiCheckSquare, color: '#10b981', bg: '#ecfdf5' },
  hire_rejected: { label: 'Declined hire invitation', icon: FiMessageSquare, color: '#ef4444', bg: '#fef2f2' },
  project_created: { label: 'Created project', icon: FiFolder, color: '#f59e0b', bg: '#fffbeb' },
  project_joined: { label: 'Joined project', icon: FiUserPlus, color: '#8b5cf6', bg: '#f5f3ff' },
  workspace_joined: { label: 'Joined workspace', icon: FiFolder, color: '#10b981', bg: '#ecfdf5' },
  workspace_created: { label: 'Created workspace', icon: FiFolder, color: '#f59e0b', bg: '#fffbeb' },
  message_sent: { label: 'Sent message', icon: FiMessageSquare, color: '#3b82f6', bg: '#eff6ff' },
  proposal_submitted: { label: 'Submitted proposal', icon: FiFileText, color: '#8b5cf6', bg: '#f5f3ff' },
  proposal_accepted: { label: 'Accepted proposal', icon: FiCheckSquare, color: '#10b981', bg: '#ecfdf5' }
};

const ActivityLogPage = () => {
  const { workspaces } = useOutletContext();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchActivities();
  }, [selectedWorkspace, selectedAction, page]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (selectedWorkspace !== 'all') params.append('workspace', selectedWorkspace);
      if (selectedAction !== 'all') params.append('action', selectedAction);

      const res = await api.get(`/activities?${params.toString()}`);
      setActivities(res.data.data || []);
      setTotalPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setError('Failed to load activity log.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Group activities by date
  const groupedActivities = {};
  activities.forEach(activity => {
    const dateKey = new Date(activity.createdAt).toDateString();
    if (!groupedActivities[dateKey]) {
      groupedActivities[dateKey] = { label: formatDateHeader(activity.createdAt), items: [] };
    }
    groupedActivities[dateKey].items.push(activity);
  });

  return (
    <div className="activity-log-page page-enter">
      <div className="activity-log-header">
        <div>
          <h1>Activity Log</h1>
          <p className="page-subtitle">Track all your activities across workspaces</p>
        </div>
        <div className="activity-log-count">{total} total activit{total !== 1 ? 'ies' : 'y'}</div>
      </div>

      <div className="activity-log-filters">
        <div className="filter-group">
          <FiFilter size={16} />
          <select
            value={selectedWorkspace}
            onChange={(e) => { setSelectedWorkspace(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="all">All Workspaces</option>
            {(workspaces || []).map(ws => (
              <option key={ws._id} value={ws._id}>{ws.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <select
            value={selectedAction}
            onChange={(e) => { setSelectedAction(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="all">All Activity Types</option>
            <option value="task_created">Task Created</option>
            <option value="task_updated">Task Updated</option>
            <option value="task_completed">Task Completed</option>
            <option value="task_assigned">Task Assigned</option>
            <option value="hire_sent">Hire Invitation Sent</option>
            <option value="hire_accepted">Hire Accepted</option>
            <option value="hire_rejected">Hire Rejected</option>
            <option value="project_created">Project Created</option>
            <option value="workspace_joined">Workspace Joined</option>
            <option value="workspace_created">Workspace Created</option>
          </select>
        </div>
      </div>

      {loading && page === 1 ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading activities...</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchActivities}>Retry</button>
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <FiClock size={48} />
          <h3>No activities yet</h3>
          <p>Your activities will appear here as you use WorkHive.</p>
        </div>
      ) : (
        <>
          {Object.entries(groupedActivities).map(([dateKey, group]) => (
            <div key={dateKey} className="activity-date-group">
              <div className="activity-date-header">{group.label}</div>
              <div className="activity-date-list">
                {group.items.map(activity => {
                  const config = ACTION_CONFIG[activity.action] || {
                    label: activity.action,
                    icon: FiClock,
                    color: '#6b7280',
                    bg: '#f3f4f6'
                  };
                  const Icon = config.icon;
                  return (
                    <div key={activity._id} className="activity-log-item">
                      <div
                        className="activity-log-icon"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="activity-log-content">
                        <div className="activity-log-main">
                          <span className="activity-log-action">{config.label}</span>
                          <span className="activity-log-target">{activity.target}</span>
                        </div>
                        <div className="activity-log-meta">
                          {activity.workspace?.name && (
                            <span className="activity-log-workspace">{activity.workspace.name}</span>
                          )}
                          {activity.project?.name && (
                            <span className="activity-log-project">{activity.project.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="activity-log-time">
                        {formatTimeAgo(activity.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="activity-log-pagination">
              <button
                className="btn-secondary"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">Page {page} of {totalPages}</span>
              <button
                className="btn-secondary"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivityLogPage;