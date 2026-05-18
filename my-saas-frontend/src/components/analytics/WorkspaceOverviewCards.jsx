import React from 'react';
import { FiFolder, FiCheckSquare, FiUsers, FiAward } from 'react-icons/fi';

const WorkspaceOverviewCards = ({ data }) => {
  if (!data) return <div className="analytics-empty">No overview data available</div>;

  const cards = [
    { title: 'Projects', value: data.projects || 0, icon: FiFolder, color: '#3b82f6' },
    { title: 'Total Tasks', value: data.totalTasks || 0, icon: FiCheckSquare, color: '#10b981' },
    { title: 'Members', value: data.members || 0, icon: FiUsers, color: '#8b5cf6' },
    { title: 'Tokens', value: data.totalTokens || 0, icon: FiAward, color: '#f59e0b' },
  ];

  const statusColors = {
    'Todo': '#6b7280',
    'In Progress': '#3b82f6',
    'Done': '#10b981',
  };

  return (
    <div className="analytics-overview">
      <div className="analytics-cards-grid">
        {cards.map((card, idx) => (
          <div key={idx} className="analytics-stat-card">
            <div className="stat-icon" style={{ color: card.color }}><card.icon /></div>
            <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
            <div className="stat-label">{card.title}</div>
          </div>
        ))}
      </div>

      <div className="analytics-section">
        <h3>Task Breakdown</h3>
        <div className="task-status-bars">
          {Object.entries(data.tasks || {}).map(([status, count]) => (
            <div key={status} className="task-status-row">
              <span className="status-label">{status}</span>
              <div className="status-bar-container">
                <div
                  className="status-bar-fill"
                  style={{
                    width: `${data.totalTasks > 0 ? (count / data.totalTasks) * 100 : 0}%`,
                    backgroundColor: statusColors[status] || '#6b7280'
                  }}
                />
              </div>
              <span className="status-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceOverviewCards;