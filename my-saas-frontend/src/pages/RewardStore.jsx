// src/pages/RewardStore.jsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiHexagon } from 'react-icons/fi';
import api from '../services/api';

const RewardStore = () => {
  const { user } = useOutletContext();
  const [activeCategory, setActiveCategory] = useState('all');
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');

  useEffect(() => {
    api.get('/workspaces')
      .then(res => {
        const ws = res.data.data || res.data || [];
        setWorkspaces(ws);
        if (ws.length > 0) setSelectedWorkspace(ws[0]._id);
      })
      .catch(() => setWorkspaces([]));
  }, []);

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
    if (user?.wallet?.balance < product.cost) {
      alert("Not enough tokens!");
      return;
    }

    if (window.confirm(`Redeem "${product.title}" for ${product.cost} HT?`)) {
      try {
        const res = await api.post('/redemptions', {
          rewardTitle: product.title,
          cost: product.cost,
          workspaceId: selectedWorkspace
        });
        alert(res.data.msg);
      } catch (err) {
        alert(err.response?.data?.msg || "Redemption failed.");
      }
    }
  };

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
              <div className="reward-balance-label">Your Balance</div>
              <div className="reward-balance-value">
                {user?.wallet?.balance || 0} HT
              </div>
            </div>
          </div>
        </div>
      </div>

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
                disabled={user?.wallet?.balance < product.cost}
              >
                {user?.wallet?.balance < product.cost ? 'Insufficient Balance' : 'Redeem'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RewardStore;