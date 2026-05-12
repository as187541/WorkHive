import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FiFilter, FiClock, FiCheckSquare, FiUserPlus, FiFolder,
  FiMessageSquare, FiFileText, FiArrowRight, FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import { ACTION_CONFIG, ACTION_TYPE_OPTIONS, formatTimeAgo, formatDateHeader, groupActivitiesByDate, useActivityData } from '../hooks/useActivityData';

const ICON_MAP = {
  FiFileText, FiCheckSquare, FiUserPlus, FiFolder, FiMessageSquare, FiClock
};

const ActivityLogPage = () => {
  const { workspaces } = useOutletContext();
  const [selectedWorkspace, setSelectedWorkspace] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [page, setPage] = useState(1);

  const { activities, loading, error, totalPages, total, refetch } = useActivityData(workspaces, {
    workspace: selectedWorkspace,
    action: selectedAction,
    page,
    limit: 20
  });

  const groupedActivities = groupActivitiesByDate(activities);

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
            {ACTION_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
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
          <button className="btn-primary" onClick={() => refetch()}>Retry</button>
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
                    icon: 'FiClock',
                    color: '#6b7280',
                    bg: '#f3f4f6'
                  };
                  const Icon = ICON_MAP[config.icon] || FiClock;
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