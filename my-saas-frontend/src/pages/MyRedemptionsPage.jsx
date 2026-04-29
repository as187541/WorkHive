  import React, { useState, useEffect } from 'react';
import { FiClock, FiCheck, FiX, FiAward } from 'react-icons/fi';
import api from '../services/api';

const MyRedemptionsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      const res = await api.get('/redemptions/my');
      setRequests(res.data.data || []);
    } catch {
      alert('Failed to load your requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return <FiCheck style={{ color: 'var(--success-500)' }} />;
      case 'Denied': return <FiX style={{ color: 'var(--danger-500)' }} />;
      default: return <FiClock style={{ color: 'var(--warning-500)' }} />;
    }
  };

  if (loading) return <div className="admin-page-container"><div className="loading-spinner"></div></div>;

  return (
    <div className="admin-page-container">
      <header className="admin-page-header">
        <div className="admin-header-icon"><FiAward /></div>
        <div>
          <h1>My Redemption Requests</h1>
          <p>Track the status of your reward requests</p>
        </div>
      </header>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reward</th>
              <th>Cost</th>
              <th>Status</th>
              <th>Requested</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center text-muted" style={{ padding: '2rem' }}>
                  No requests yet. Visit the Reward Store to redeem!
                </td>
              </tr>
            ) : (
              requests.map(req => (
                <tr key={req._id}>
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
                  <td>{new Date(req.requestedAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyRedemptionsPage;
