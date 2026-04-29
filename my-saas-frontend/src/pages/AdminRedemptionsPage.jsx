import React, { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiX, FiClock, FiAward } from 'react-icons/fi';
import api from '../services/api';

const AdminRedemptionsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/redemptions?status=${filter}`);
      setRequests(res.data.data || []);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setActionLoading(id);
      await api.patch(`/redemptions/${id}/approve`);
      setRequests(requests.filter(r => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (id) => {
    if (!window.confirm('Are you sure you want to deny this request?')) return;
    try {
      setActionLoading(id);
      await api.patch(`/redemptions/${id}/deny`);
      setRequests(requests.filter(r => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to deny');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return <FiCheck className="status-icon approved" />;
      case 'Denied': return <FiX className="status-icon denied" />;
      default: return <FiClock className="status-icon pending" />;
    }
  };

  if (loading) return <div className="admin-page-container"><div className="loading-spinner"></div></div>;

  return (
    <div className="admin-page-container">
      <header className="admin-page-header">
        <div className="admin-header-icon"><FiBell /></div>
        <div>
          <h1>Redemption Requests</h1>
          <p>Review and manage reward redemption requests</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="admin-filters">
          {['Pending', 'Approved', 'Denied', 'All'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-secondary'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Workspace</th>
              <th>Project</th>
              <th>Reward</th>
              <th>Cost</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center text-muted" style={{ padding: '2rem' }}>
                  No {filter.toLowerCase()} requests found.
                </td>
              </tr>
            ) : (
              requests.map(req => (
                <tr key={req._id}>
                  <td>
                    <div className="user-cell">
                      {req.user?.avatar ? (
                        <img src={req.user.avatar} alt="" className="user-avatar-sm" />
                      ) : (
                        <div className="user-avatar-placeholder">
                          {req.user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div>{req.user?.name}</div>
                        <div className="text-muted text-sm">{req.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="workspace-badge">{req.workspace?.name || 'Unknown'}</span>
                  </td>
                  <td>
                    <span className="project-badge">{req.project?.name || '-'}</span>
                  </td>
                  <td>{req.rewardTitle}</td>
                  <td>
                    <span className="token-balance">
                      <FiAward style={{ marginRight: '4px' }} />
                      {req.cost} HT
                    </span>
                  </td>
                  <td>
                    <span className={`audit-badge ${req.status.toLowerCase()}`}>
                      {getStatusIcon(req.status)}
                      {req.status}
                    </span>
                  </td>
                  <td>{new Date(req.requestedAt).toLocaleString()}</td>
                  <td>
                    {req.status === 'Pending' && (
                      <div className="action-buttons">
                        <button
                          onClick={() => handleApprove(req._id)}
                          disabled={actionLoading === req._id}
                          className="btn btn-icon btn-success"
                          title="Approve"
                        >
                          <FiCheck />
                        </button>
                        <button
                          onClick={() => handleDeny(req._id)}
                          disabled={actionLoading === req._id}
                          className="btn btn-icon btn-danger"
                          title="Deny"
                        >
                          <FiX />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminRedemptionsPage;
