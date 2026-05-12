import React, { useState, useEffect } from 'react';
import { FiClock, FiCheck, FiX, FiHexagon, FiTruck } from 'react-icons/fi';
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

  if (loading) return <div className="loading-state"><div className="spinner"></div></div>;

  return (
    <div className="redemptions-page">
      <header className="page-header">
        <div>
          <h1>My Redemptions</h1>
          <p className="page-description">Track your reward redemptions</p>
        </div>
      </header>

      <div className="redemptions-list">
        {requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎁</div>
            <h3>No redemptions yet</h3>
            <p>Visit the Reward Store to redeem your Hive Tokens!</p>
          </div>
        ) : (
          requests.map(req => (
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
    </div>
  );
};

export default MyRedemptionsPage;
