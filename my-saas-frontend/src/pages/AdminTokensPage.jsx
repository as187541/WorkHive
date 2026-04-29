import React, { useState, useEffect } from 'react';
import { FiAward, FiTrendingUp, FiTrendingDown, FiUsers, FiPieChart, FiActivity } from 'react-icons/fi';
import api from '../services/api';

const AdminTokensPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quickUserId, setQuickUserId] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickReason, setQuickReason] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/token-stats');
      setStats(res.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load token statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAlter = async () => {
    if (!quickUserId || !quickAmount) {
      alert('Please provide both User ID and Amount');
      return;
    }

    try {
      setQuickLoading(true);
      await api.post(`/admin/users/${quickUserId}/tokens`, {
        amount: Number(quickAmount),
        reason: quickReason || 'Quick admin adjustment'
      });
      
      alert('Tokens altered successfully!');
      setQuickUserId('');
      setQuickAmount('');
      setQuickReason('');
      fetchStats(); // Refresh stats
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to alter tokens');
    } finally {
      setQuickLoading(false);
    }
  };

  if (loading) return <div className="admin-page-container"><div className="loading-spinner"></div></div>;
  if (error) return <div className="admin-page-container"><div className="error-message">{error}</div></div>;

  const { topHolders, distribution, overall } = stats || {};

  return (
    <div className="admin-page-container">
      <header className="admin-page-header">
        <div className="admin-header-icon"><FiAward /></div>
        <div>
          <h1>Token Management</h1>
          <p>Monitor and manage HiveToken distribution across the platform</p>
        </div>
      </header>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ color: 'var(--token-gold)' }}><FiAward /></div>
          <div className="stat-value" style={{ color: 'var(--token-gold)' }}>{overall?.totalTokens?.toLocaleString() || 0}</div>
          <div className="stat-label">Total Tokens in Circulation</div>
        </div>
        
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ color: 'var(--primary-500)' }}><FiUsers /></div>
          <div className="stat-value" style={{ color: 'var(--primary-500)' }}>{overall?.userCount?.toLocaleString() || 0}</div>
          <div className="stat-label">Total Users</div>
        </div>
        
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ color: 'var(--success-500)' }}><FiTrendingUp /></div>
          <div className="stat-value" style={{ color: 'var(--success-500)' }}>{Math.round(overall?.averageBalance || 0).toLocaleString()}</div>
          <div className="stat-label">Average Balance</div>
        </div>
      </div>

      <div className="admin-section">
        <h2><FiPieChart style={{ marginRight: '8px' }} /> Token Distribution</h2>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Balance Range</th>
                <th>Users</th>
                <th>Total Tokens</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {distribution?.map((bucket, idx) => {
                const totalUsers = overall?.userCount || 1;
                const percentage = ((bucket.count / totalUsers) * 100).toFixed(1);
                return (
                  <tr key={idx}>
                    <td>
                      <span className="range-badge">
                        {bucket._id === '10000+' ? '10,000+' : `${bucket._id.toLocaleString()} - ${(bucket._id + (idx === 0 ? 100 : idx === 1 ? 400 : idx === 2 ? 500 : idx === 3 ? 4000 : 5000)).toLocaleString()}`}
                      </span>
                    </td>
                    <td>{bucket.count.toLocaleString()}</td>
                    <td>{bucket.totalTokens?.toLocaleString() || 0}</td>
                    <td>
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${percentage}%`, backgroundColor: 'var(--token-gold)' }}
                        />
                        <span>{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-section">
        <h2><FiTrendingUp style={{ marginRight: '8px' }} /> Top Token Holders</h2>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>Email</th>
                <th>Balance</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {topHolders?.map((holder, idx) => {
                const share = overall?.totalTokens > 0 
                  ? ((holder.wallet?.balance / overall.totalTokens) * 100).toFixed(2) 
                  : 0;
                return (
                  <tr key={holder._id}>
                    <td><span className="rank-badge">#{idx + 1}</span></td>
                    <td>{holder.name}</td>
                    <td><span className="text-muted">{holder.email}</span></td>
                    <td>
                      <span className="token-balance">
                        <FiAward style={{ marginRight: '4px' }} />
                        {holder.wallet?.balance?.toLocaleString() || 0} HT
                      </span>
                    </td>
                    <td>{share}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-section">
        <h2><FiActivity style={{ marginRight: '8px' }} /> Quick Token Adjustment</h2>
        <div className="quick-action-card">
          <div className="form-row">
            <div className="form-group">
              <label>User ID</label>
              <input
                type="text"
                value={quickUserId}
                onChange={(e) => setQuickUserId(e.target.value)}
                placeholder="Paste user ID here"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label>Amount (+ to add, - to deduct)</label>
              <input
                type="number"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                placeholder="e.g. 1000 or -500"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label>Reason (optional)</label>
              <input
                type="text"
                value={quickReason}
                onChange={(e) => setQuickReason(e.target.value)}
                placeholder="e.g. Monthly bonus"
                className="form-input"
              />
            </div>
          </div>
          
          <button
            onClick={handleQuickAlter}
            disabled={quickLoading}
            className="btn btn-primary"
          >
            {quickLoading ? 'Processing...' : 'Alter Tokens'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminTokensPage;
