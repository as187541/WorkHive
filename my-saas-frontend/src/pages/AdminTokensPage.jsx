import React, { useState, useEffect, useRef } from 'react';
import { FiAward, FiTrendingUp, FiTrendingDown, FiUsers, FiPieChart, FiActivity, FiSearch } from 'react-icons/fi';
import api from '../services/api';

const AdminTokensPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quickUserId, setQuickUserId] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickReason, setQuickReason] = useState('');
  const [quickWorkspaceId, setQuickWorkspaceId] = useState('');
  const [adminWorkspaces, setAdminWorkspaces] = useState([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    api.get('/workspaces')
      .then(res => setAdminWorkspaces(res.data.data || res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/admin/users')
      .then(res => setAllUsers(res.data.data || []))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserSearch = (query) => {
    setUserSearch(query);
    if (!query || query.length < 1) {
      setSearchResults([]);
      setQuickUserId('');
      return;
    }
    const filtered = allUsers.filter(u =>
      u.name?.toLowerCase().includes(query.toLowerCase()) ||
      u.email?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
    setSearchResults(filtered);
  };

  const selectUser = (user) => {
    setQuickUserId(user._id);
    setUserSearch(`${user.name} (${user.email})`);
    setSearchResults([]);
  };

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
      alert('Please select a user and provide an amount');
      return;
    }

    try {
      setQuickLoading(true);
      const payload = {
        amount: Number(quickAmount),
        reason: quickReason || 'Quick admin adjustment'
      };
      if (quickWorkspaceId) {
        payload.workspaceId = quickWorkspaceId;
      }
      await api.post(`/admin/users/${quickUserId}/tokens`, payload);
      
      alert('Tokens altered successfully!');
      setQuickUserId('');
      setQuickAmount('');
      setQuickReason('');
      setQuickWorkspaceId('');
      setUserSearch('');
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
              <label>User</label>
              <div ref={searchRef} style={{ position: 'relative' }}>
                <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.875rem', zIndex: 1 }} />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="form-input"
                  style={{ paddingLeft: '2rem' }}
                />
                {searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    borderRadius: '0 0 8px 8px', maxHeight: '240px', overflowY: 'auto',
                    zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {searchResults.map(u => (
                      <div
                        key={u._id}
                        onClick={() => selectUser(u)}
                        style={{
                          padding: '10px 12px', cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.05))'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--token-gold, #f59e0b)', fontWeight: 600 }}>
                          {u.wallet?.balance || 0} HT
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {quickUserId && (
                <div style={{ fontSize: '0.75rem', color: 'var(--success-500, #10b981)', marginTop: 4 }}>
                  ✓ User selected
                </div>
              )}
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

            <div className="form-group">
              <label>Workspace <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(required for spending)</span></label>
              <select
                value={quickWorkspaceId}
                onChange={(e) => setQuickWorkspaceId(e.target.value)}
                className="form-input"
              >
                <option value="">Global only (not redeemable)</option>
                {adminWorkspaces.map(ws => (
                  <option key={ws._id} value={ws._id}>{ws.name}</option>
                ))}
              </select>
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
