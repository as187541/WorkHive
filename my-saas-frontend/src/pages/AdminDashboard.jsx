import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiLayout, FiCheckSquare, FiAward, FiShield, FiActivity, FiTrendingUp, FiShoppingBag } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.allSettled([
          api.get('/admin/stats'),
          api.get('/admin/analytics')
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
        if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data.data);
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

      {analytics && (
        <div className="admin-section">
          <h2><FiTrendingUp style={{ marginRight: '8px' }} /> Platform Analytics</h2>
          <div className="admin-analytics-grid">
            <div className="admin-analytics-card">
              <h4>Users by Role</h4>
              {analytics.usersByRole && Object.keys(analytics.usersByRole).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={Object.entries(analytics.usersByRole).map(([name, value]) => ({ name, value }))}
                      cx="50%" cy="50%" outerRadius={70}
                      dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {Object.entries(analytics.usersByRole).map((_, idx) => (
                        <Cell key={idx} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][idx % 4]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-muted">No data</p>}
            </div>

            <div className="admin-analytics-card">
              <h4>Tasks by Status</h4>
              {analytics.tasksByStatus && Object.keys(analytics.tasksByStatus).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Object.entries(analytics.tasksByStatus).map(([name, count]) => ({ name, count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-muted">No data</p>}
            </div>

            <div className="admin-analytics-card">
              <h4>Orders by Status</h4>
              {analytics.ordersByStatus && Object.keys(analytics.ordersByStatus).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Object.entries(analytics.ordersByStatus).map(([name, data]) => ({ name, count: data.count, value: data.value }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-muted">No data</p>}
            </div>

            <div className="admin-analytics-card">
              <h4>Top Activities (30 days)</h4>
              {analytics.topActivities?.length > 0 ? (
                <ul className="admin-activity-list">
                  {analytics.topActivities.slice(0, 8).map((a, idx) => (
                    <li key={idx} className="admin-activity-item">
                      <span className="activity-name">{a._id.replace(/_/g, ' ')}</span>
                      <span className="activity-count">{a.count}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-muted">No activity data</p>}
            </div>
          </div>
        </div>
      )}

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
