import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiLayout, FiCheckSquare, FiAward, FiShield, FiActivity } from 'react-icons/fi';
import api from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data.data);
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="admin-page-container"><div className="loading-spinner"></div></div>;
  if (error) return <div className="admin-page-container"><div className="error-message">{error}</div></div>;

  const statCards = [
    { title: 'Total Users', value: stats?.users || 0, icon: <FiUsers />, color: 'var(--primary-500)', link: '/admin/users' },
    { title: 'Workspaces', value: stats?.workspaces || 0, icon: <FiLayout />, color: 'var(--admin-accent)', link: '/admin/workspaces' },
    { title: 'Tasks', value: stats?.tasks || 0, icon: <FiCheckSquare />, color: 'var(--success-500)', link: null },
    { title: 'Total Tokens', value: stats?.totalTokens || 0, icon: <FiAward />, color: 'var(--token-gold)', link: '/admin/tokens' },
  ];

  return (
    <div className="admin-page-container">
      <header className="admin-page-header">
        <div className="admin-header-icon"><FiShield /></div>
        <div>
          <h1>SuperAdmin Dashboard</h1>
          <p>Platform overview and management</p>
        </div>
      </header>

      <div className="admin-stats-grid">
        {statCards.map((card, idx) => (
          card.link ? (
            <Link to={card.link} key={idx} className="admin-stat-card">
              <div className="stat-icon" style={{ color: card.color }}>{card.icon}</div>
              <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
              <div className="stat-label">{card.title}</div>
            </Link>
          ) : (
            <div key={idx} className="admin-stat-card">
              <div className="stat-icon" style={{ color: card.color }}>{card.icon}</div>
              <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
              <div className="stat-label">{card.title}</div>
            </div>
          )
        ))}
      </div>

      <div className="admin-section">
        <h2><FiActivity style={{ marginRight: '8px' }} /> Recent Audit Logs</h2>
        {stats?.recentLogs?.length > 0 ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{log.adminId?.name || 'Unknown'}</td>
                    <td><span className={`audit-badge ${log.action.toLowerCase()}`}>{log.action}</span></td>
                    <td>{log.targetType} {log.targetId ? `(${log.targetId.toString().slice(-6)})` : ''}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="admin-table-footer">
              <Link to="/admin/logs" className="btn btn-primary btn-sm">View All Logs →</Link>
            </div>
          </div>
        ) : (
          <p className="text-muted">No recent audit logs.</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
