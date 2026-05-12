import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const MyProposals = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/proposals/my');
      setProposals(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load your proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleWithdraw = async (proposalId) => {
    if (!window.confirm('Withdraw this proposal?')) return;
    try {
      setActionLoading(proposalId);
      await api.patch(`/proposals/${proposalId}/withdraw`);
      setProposals(prev =>
        prev.map(p => p._id === proposalId ? { ...p, status: 'Withdrawn' } : p)
      );
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to withdraw proposal');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProposals = filterStatus === 'all'
    ? proposals
    : proposals.filter(p => p.status.toLowerCase() === filterStatus);

  const statusCounts = {
    all: proposals.length,
    pending: proposals.filter(p => p.status === 'Pending').length,
    accepted: proposals.filter(p => p.status === 'Accepted').length,
    rejected: proposals.filter(p => p.status === 'Rejected').length,
    withdrawn: proposals.filter(p => p.status === 'Withdrawn').length
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'Accepted': return 'status-accepted';
      case 'Rejected': return 'status-rejected';
      case 'Withdrawn': return 'status-withdrawn';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="my-proposals-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your proposals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-proposals-page page-enter">
      <header className="page-header">
        <div>
          <h1>My Proposals</h1>
          <p>Track the status of your submitted proposals.</p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="status-tabs">
        {['all', 'pending', 'accepted', 'rejected', 'withdrawn'].map(status => (
          <button
            key={status}
            className={`status-tab ${filterStatus === status ? 'active' : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="tab-count">{statusCounts[status]}</span>
          </button>
        ))}
      </div>

      {filteredProposals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>No {filterStatus !== 'all' ? filterStatus : ''} proposals</h3>
          <p>{filterStatus === 'all' ? 'Browse jobs and submit your first proposal!' : `No ${filterStatus} proposals found.`}</p>
          {filterStatus === 'all' && (
            <button className="btn btn-primary" onClick={() => navigate('/jobs')}>
              Browse Jobs
            </button>
          )}
        </div>
      ) : (
        <div className="proposals-table-container">
          <table className="proposals-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Your Price</th>
                <th>Delivery</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map(proposal => {
                const job = proposal.jobPosting || {};
                return (
                  <tr key={proposal._id} className="proposal-row">
                    <td>
                      <div
                        className="proposal-job-title"
                        onClick={() => navigate(`/jobs/${job._id}`)}
                        style={{ cursor: 'pointer', color: 'var(--primary-500)' }}
                      >
                        {job.title || 'Unknown Job'}
                      </div>
                      <div className="proposal-job-meta">
                        <span className="proposal-job-category">{job.category || 'General'}</span>
                        <span className="proposal-job-poster">
                          by {job.postedBy?.name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="proposal-price">
                        {proposal.proposedPrice} {proposal.currency || 'HT'}
                      </span>
                    </td>
                    <td>{proposal.deliveryDays} days</td>
                    <td>
                      <span className={`status-badge ${getStatusColor(proposal.status)}`}>
                        {proposal.status}
                      </span>
                      {proposal.status === 'Accepted' && (
                        <div className="proposal-accepted-note" style={{ fontSize: '0.75rem', color: 'var(--success-500)', marginTop: '4px' }}>
                          🎉 Check your invitations
                        </div>
                      )}
                      {proposal.status === 'Rejected' && (
                        <div className="proposal-rejected-note" style={{ fontSize: '0.75rem', color: 'var(--danger-500)', marginTop: '4px' }}>
                          Keep applying!
                        </div>
                      )}
                    </td>
                    <td>{new Date(proposal.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="proposal-actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate(`/jobs/${job._id}`)}
                        >
                          View Job
                        </button>
                        {proposal.status === 'Pending' && (
                          <button
                            className="btn btn-sm btn-danger-outline"
                            onClick={() => handleWithdraw(proposal._id)}
                            disabled={actionLoading === proposal._id}
                          >
                            {actionLoading === proposal._id ? '...' : 'Withdraw'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyProposals;
