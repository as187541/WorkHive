// src/pages/RewardStore.jsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FiHexagon, FiClock, FiCheck, FiX, FiTruck, FiBell, FiAward,
  FiShoppingBag, FiInbox, FiPackage
} from 'react-icons/fi';
import api from '../services/api';

const RewardStore = () => {
  const { user } = useOutletContext();
  const [activeTab, setActiveTab] = useState('store');
  const [activeCategory, setActiveCategory] = useState('all');
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');

  // My Redemptions state
  const [myRequests, setMyRequests] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  // Review Requests state
  const [reviewRequests, setReviewRequests] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('Pending');
  const [actionLoading, setActionLoading] = useState(null);

  // Workspace balances state
  const [workspaceBalances, setWorkspaceBalances] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);

  const isApprover = user?.approverScope?.adminWorkspaces?.length > 0 || user?.approverScope?.leadProjects?.length > 0;

  useEffect(() => {
    api.get('/workspaces')
      .then(res => {
        const ws = res.data.data || res.data || [];
        setWorkspaces(ws);
        if (ws.length > 0) setSelectedWorkspace(ws[0]._id);
      })
      .catch(() => setWorkspaces([]));
  }, []);

  useEffect(() => {
    api.get('/auth/workspace-balances')
      .then(res => {
        setWorkspaceBalances(res.data.workspaces || []);
        setTotalBalance(res.data.totalBalance || 0);
      })
      .catch(() => {});
  }, [user]);

  // Get balance for selected workspace
  const selectedWorkspaceBalance = workspaceBalances.find(
    wb => wb.workspaceId === selectedWorkspace
  )?.balance || 0;

  useEffect(() => {
    if (activeTab === 'my-redemptions') fetchMyRequests();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'review-requests') fetchReviewRequests();
  }, [activeTab, reviewFilter]);

  const fetchMyRequests = async () => {
    try {
      setMyLoading(true);
      const res = await api.get('/redemptions/my');
      setMyRequests(res.data.data || []);
    } catch {
      alert('Failed to load your requests');
    } finally {
      setMyLoading(false);
    }
  };

  const fetchReviewRequests = async () => {
    try {
      setReviewLoading(true);
      const res = await api.get(`/redemptions?status=${reviewFilter}`);
      setReviewRequests(res.data.data || []);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to load requests');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setActionLoading(id);
      await api.patch(`/redemptions/${id}/approve`);
      setReviewRequests(reviewRequests.filter(r => r._id !== id));
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
      setReviewRequests(reviewRequests.filter(r => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to deny');
    } finally {
      setActionLoading(null);
    }
  };

  const products = [
    {
      id: '1',
      title: 'WorkHive Premium T-Shirt',
      description: 'High-quality cotton t-shirt with WorkHive logo',
      cost: 200,
      stock: 45,
      category: 'merchandise',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop'
    },
    {
      id: '2',
      title: 'Amazon Gift Card - $50',
      description: 'Redeemable on Amazon.com for any purchase',
      cost: 500,
      stock: 100,
      category: 'gift-cards',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop'
    },
    {
      id: '3',
      title: 'Wireless Noise-Cancelling Headphones',
      description: 'Premium headphones for focused work sessions',
      cost: 800,
      stock: 12,
      category: 'merchandise',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'
    },
    {
      id: '4',
      title: 'Coffee Shop Experience',
      description: 'Premium coffee tasting experience for two',
      cost: 350,
      stock: 20,
      category: 'experiences',
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop'
    },
    {
      id: '5',
      title: 'Netflix Subscription - 3 Months',
      description: 'Stream your favorite shows and movies',
      cost: 450,
      stock: 50,
      category: 'gift-cards',
      image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=300&fit=crop'
    },
    {
      id: '6',
      title: 'WorkHive Water Bottle',
      description: 'Insulated stainless steel water bottle',
      cost: 150,
      stock: 80,
      category: 'merchandise',
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Rewards' },
    { id: 'merchandise', label: 'Merchandise' },
    { id: 'gift-cards', label: 'Gift Cards' },
    { id: 'experiences', label: 'Experiences' }
  ];

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory);

  const handleRedeem = async (product) => {
    if (!selectedWorkspace) {
      alert("Please select a workspace first.");
      return;
    }
    if (selectedWorkspaceBalance < product.cost) {
      alert(`Not enough tokens in this workspace! You have ${selectedWorkspaceBalance} HT in this workspace, but need ${product.cost} HT.`);
      return;
    }

    if (window.confirm(`Redeem "${product.title}" for ${product.cost} HT from workspace balance?`)) {
      try {
        const res = await api.post('/redemptions', {
          rewardTitle: product.title,
          cost: product.cost,
          workspaceId: selectedWorkspace
        });
        alert(res.data.msg);
        // Refresh workspace balances
        const balRes = await api.get('/auth/workspace-balances');
        setWorkspaceBalances(balRes.data.workspaces || []);
        setTotalBalance(balRes.data.totalBalance || 0);
      } catch (err) {
        alert(err.response?.data?.msg || "Redemption failed.");
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return <FiCheck style={{ color: 'var(--success-500)' }} />;
      case 'Shipped': return <FiTruck style={{ color: 'var(--primary-500)' }} />;
      case 'Delivered': return <FiCheck style={{ color: 'var(--success-500)' }} />;
      case 'Denied': return <FiX style={{ color: 'var(--danger-500)' }} />;
      default: return <FiClock style={{ color: 'var(--warning-500)' }} />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Approved': return 'approved';
      case 'Denied': return 'denied';
      case 'Pending': return 'pending';
      default: return 'pending';
    }
  };

  const productImages = {
    'WorkHive Premium T-Shirt': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop',
    'Amazon Gift Card - $50': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&h=200&fit=crop',
    'Wireless Noise-Cancelling Headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
    'default': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=200&h=200&fit=crop'
  };

  const tabs = [
    { id: 'store', label: 'Store', icon: FiShoppingBag },
    { id: 'my-redemptions', label: 'My Redemptions', icon: FiPackage },
    ...(isApprover ? [{ id: 'review-requests', label: 'Review Requests', icon: FiInbox }] : []),
  ];

  return (
    <div className="reward-store-page">
      <div className="reward-store-header">
        <div>
          <h1>Reward Store</h1>
          <p className="page-description">Redeem your Hive Tokens for rewards</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Workspace Selector */}
          <select
            className="workspace-select"
            value={selectedWorkspace}
            onChange={e => setSelectedWorkspace(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            <option value="">Select Workspace</option>
            {workspaces.map(ws => (
              <option key={ws._id} value={ws._id}>{ws.name}</option>
            ))}
          </select>

          <div className="reward-balance-card">
            <div className="token-icon">
              <FiHexagon size={20} />
            </div>
            <div className="reward-balance-info">
              <div className="reward-balance-label">
                {selectedWorkspace ? 'Workspace Balance' : 'Total Balance'}
              </div>
              <div className="reward-balance-value">
                {selectedWorkspace ? selectedWorkspaceBalance : totalBalance} HT
              </div>
              {selectedWorkspace && totalBalance !== selectedWorkspaceBalance && (
                <div className="reward-balance-sub" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Total: {totalBalance} HT
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="category-tabs" style={{ marginBottom: '1.5rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`category-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== STORE TAB ===== */}
      {activeTab === 'store' && (
        <>
          {/* Category Tabs */}
          <div className="category-tabs">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="content-grid">
            {filteredProducts.map(product => (
              <div key={product.id} className="service-package-card">
                <div className="service-card-image">
                  <img src={product.image} alt={product.title} loading="lazy" />
                </div>

                <div className="service-card-content">
                  <h3 className="service-card-title">{product.title}</h3>
                  <p className="service-card-description">{product.description}</p>

                  <div className="service-card-footer">
                    <div className="service-card-price">
                      <FiHexagon size={16} style={{ color: 'var(--primary-500)' }} />
                      <span className="price-value">{product.cost}</span>
                      <span className="price-currency">HT</span>
                    </div>
                    <span className="stock-count">{product.stock} in stock</span>
                  </div>

                  <button
                    className="btn btn-primary redeem-btn"
                    onClick={() => handleRedeem(product)}
                    disabled={!selectedWorkspace || selectedWorkspaceBalance < product.cost}
                  >
                    {!selectedWorkspace ? 'Select Workspace' : selectedWorkspaceBalance < product.cost ? 'Insufficient Balance' : 'Redeem'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== MY REDEMPTIONS TAB ===== */}
      {activeTab === 'my-redemptions' && (
        <div className="redemptions-list">
          {myLoading ? (
            <div className="loading-state"><div className="spinner"></div></div>
          ) : myRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎁</div>
              <h3>No redemptions yet</h3>
              <p>Visit the Store tab to redeem your Hive Tokens!</p>
            </div>
          ) : (
            myRequests.map(req => (
              <div key={req._id} className="redemption-card">
                <img
                  src={productImages[req.rewardTitle] || productImages.default}
                  alt={req.rewardTitle}
                  className="redemption-image"
                />

                <div className="redemption-details">
                  <h3>{req.rewardTitle}</h3>
                  <div className="redemption-meta">
                    <span className="redemption-meta-item">
                      Requested on {new Date(req.requestedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="redemption-status">
                    <span className={`status-badge ${getStatusClass(req.status)}`}>
                      {getStatusIcon(req.status)}
                      {req.status}
                    </span>

                    {req.processedAt && (
                      <span className="tracking-number">
                        {req.status === 'Approved' ? 'Approved' : req.status === 'Denied' ? 'Denied' : 'Processed'} on {new Date(req.processedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--primary-600)' }}>
                    <FiHexagon size={16} />
                    {req.cost} HT
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== REVIEW REQUESTS TAB ===== */}
      {activeTab === 'review-requests' && (
        <>
          <div className="admin-toolbar" style={{ marginBottom: '1rem' }}>
            <div className="admin-filters">
              {['Pending', 'Approved', 'Denied', 'All'].map(status => (
                <button
                  key={status}
                  onClick={() => setReviewFilter(status)}
                  className={`btn btn-sm ${reviewFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {reviewLoading ? (
            <div className="loading-state"><div className="spinner"></div></div>
          ) : (
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
                  {reviewRequests.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center text-muted" style={{ padding: '2rem' }}>
                        No {reviewFilter.toLowerCase()} requests found.
                      </td>
                    </tr>
                  ) : (
                    reviewRequests.map(req => (
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
          )}
        </>
      )}
    </div>
  );
};

export default RewardStore;