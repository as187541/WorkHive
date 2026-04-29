import React, { useState, useEffect } from 'react';
import { FiActivity, FiFilter, FiCalendar, FiUser, FiTarget, FiServer } from 'react-icons/fi';
import api from '../services/api';

const AdminLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: ''
  });

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'USER_DELETE', label: 'User Delete' },
    { value: 'USER_ROLE_UPDATE', label: 'Role Update' },
    { value: 'TOKEN_ALTER', label: 'Token Alter' },
    { value: 'WORKSPACE_DELETE', label: 'Workspace Delete' },
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGOUT', label: 'Logout' }
  ];

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 20);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await api.get(`/admin/logs?${params.toString()}`);
      setLogs(res.data.data || []);
      setTotalPages(res.data.pages || 1);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'USER_DELETE': return <FiUser className="action-icon delete" />;
      case 'USER_ROLE_UPDATE': return <FiUser className="action-icon update" />;
      case 'TOKEN_ALTER': return <FiActivity className="action-icon token" />;
      case 'WORKSPACE_DELETE': return <FiServer className="action-icon workspace" />;
      default: return <FiActivity className="action-icon" />;
    }
  };

  const getActionClass = (action) => {
    return `audit-badge ${action.toLowerCase().replace('_', '-')}`;
  };

  if (loading && logs.length === 0) return <div className="admin-page-container"><div className="loading-spinner"></div></div>;
  if (error) return <div className="admin-page-container"><div className="error-message">{error}</div></div>;

  return (
    <div className="admin-page-container">
      <header className="admin-page-header">
        <div className="admin-header-icon"><FiActivity /></div>
        <div>
          <h1>Audit Logs</h1>
          <p>Track all administrative actions across the platform</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="admin-filters">
          <div className="filter-group">
            <FiFilter className="filter-icon" />
            <select
              value={filters.action}
              onChange={(e) => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}
              className="admin-filter-select"
            >
              {actionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <FiCalendar className="filter-icon" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setPage(1); }}
              className="admin-filter-date"
              placeholder="Start Date"
            />
          </div>
          
          <div className="filter-group">
            <span className="filter-separator">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setPage(1); }}
              className="admin-filter-date"
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Admin</th>
              <th>Target</th>
              <th>Details</th>
              <th>IP Address</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id}>
                <td>
                  <div className="action-cell">
                    {getActionIcon(log.action)}
                    <span className={getActionClass(log.action)}>{log.action}</span>
                  </div>
                </td>
                <td>
                  <div className="admin-cell">
                    <FiUser className="cell-icon" />
                    <div>
                      <div>{log.adminId?.name || 'Unknown'}</div>
                      <div className="text-muted text-sm">{log.adminId?.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="target-cell">
                    <FiTarget className="cell-icon" />
                    <div>
                      <div>{log.targetType}</div>
                      <div className="text-muted text-sm">{log.targetId ? log.targetId.toString().slice(-8) : 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="details-cell">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <pre className="details-json">{JSON.stringify(log.details, null, 2)}</pre>
                    ) : (
                      <span className="text-muted">No details</span>
                    )}
                  </div>
                </td>
                <td><code className="ip-address">{log.ipAddress}</code></td>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-sm"
          >
            ← Previous
          </button>
          
          <span className="page-info">Page {page} of {totalPages}</span>
          
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-sm"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminLogsPage;
