import React from 'react';
import { FiStar } from 'react-icons/fi';

const ContractorUtilizationTable = ({ data }) => {
  if (!data || data.length === 0) return <div className="analytics-empty">No contractor data available</div>;

  return (
    <div className="analytics-section">
      <h3>Contractor Utilization</h3>
      <div className="analytics-table-container">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Contractor</th>
              <th>Tasks Assigned</th>
              <th>Tasks Completed</th>
              <th>Completion Rate</th>
              <th>Avg Rating</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c, idx) => (
              <tr key={c.userId || idx}>
                <td className="contractor-name">
                  {c.avatar && <img src={c.avatar} alt="" className="contractor-avatar" />}
                  {c.name}
                </td>
                <td>{c.tasksAssigned}</td>
                <td>{c.tasksCompleted}</td>
                <td>
                  <div className="completion-bar">
                    <div
                      className="completion-fill"
                      style={{
                        width: `${c.completionRate}%`,
                        backgroundColor: c.completionRate >= 75 ? '#10b981' : c.completionRate >= 50 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                    <span>{c.completionRate}%</span>
                  </div>
                </td>
                <td>
                  {c.avgRating ? (
                    <span className="rating-badge">
                      <FiStar style={{ color: '#f59e0b', marginRight: 4 }} />
                      {c.avgRating} ({c.ratingCount})
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContractorUtilizationTable;