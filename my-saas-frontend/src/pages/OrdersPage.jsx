// src/pages/OrdersPage.jsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FiShoppingBag, FiDollarSign, FiClock, FiCheck, FiAlertTriangle,
  FiX, FiEye, FiArrowRight, FiPackage
} from 'react-icons/fi';
import api from '../services/api';
import OrderDetailModal from '../components/OrderDetailModal';

const STATUS_CONFIG = {
  'Created': { color: '#6b7280', bg: '#f3f4f6', icon: FiClock, label: 'Awaiting Funding' },
  'Funded': { color: '#3b82f6', bg: '#eff6ff', icon: FiDollarSign, label: 'Funded' },
  'In Progress': { color: '#f59e0b', bg: '#fffbeb', icon: FiPackage, label: 'In Progress' },
  'Delivered': { color: '#8b5cf6', bg: '#f5f3ff', icon: FiCheck, label: 'Delivered' },
  'Revision': { color: '#f97316', bg: '#fff7ed', icon: FiAlertTriangle, label: 'Revision Requested' },
  'Accepted': { color: '#10b981', bg: '#ecfdf5', icon: FiCheck, label: 'Completed' },
  'Disputed': { color: '#ef4444', bg: '#fef2f2', icon: FiAlertTriangle, label: 'Disputed' },
  'Cancelled': { color: '#9ca3af', bg: '#f9fafb', icon: FiX, label: 'Cancelled' }
};

const OrdersPage = () => {
  const { user } = useOutletContext();
  const [activeTab, setActiveTab] = useState('buyer');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = activeTab === 'buyer' ? '/orders/my-buyer' : '/orders/my-seller';
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', page);
      params.append('limit', 10);

      const res = await api.get(`${endpoint}?${params.toString()}`);
      setOrders(res.data.data || []);
      setPagination({
        page: res.data.page,
        pages: res.data.pages,
        total: res.data.total
      });
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleOrderUpdate = () => {
    fetchOrders(pagination.page);
    setIsDetailOpen(false);
    setSelectedOrder(null);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatCurrency = (amount, currency) => {
    return currency === 'USD' ? `$${amount.toFixed(2)}` : `${amount} HT`;
  };

  return (
    <div className="orders-page page-enter" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
          <FiShoppingBag style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Orders
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Manage your service orders, escrow payments, and delivery
        </p>
      </header>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--border)', paddingBottom: '0' }}>
        <button
          onClick={() => { setActiveTab('buyer'); setStatusFilter('all'); }}
          style={{
            padding: '10px 20px',
            background: activeTab === 'buyer' ? 'var(--primary-500)' : 'transparent',
            color: activeTab === 'buyer' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'buyer' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Orders I Placed
        </button>
        <button
          onClick={() => { setActiveTab('seller'); setStatusFilter('all'); }}
          style={{
            padding: '10px 20px',
            background: activeTab === 'seller' ? 'var(--primary-500)' : 'transparent',
            color: activeTab === 'seller' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'seller' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Orders I Received
        </button>
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setStatusFilter('all')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: statusFilter === 'all' ? '2px solid var(--primary-500)' : '1px solid var(--border)',
            background: statusFilter === 'all' ? 'var(--primary-50)' : 'transparent',
            color: statusFilter === 'all' ? 'var(--primary-600)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: statusFilter === 'all' ? '600' : '400'
          }}
        >
          All
        </button>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: statusFilter === status ? `2px solid ${config.color}` : '1px solid var(--border)',
              background: statusFilter === status ? config.bg : 'transparent',
              color: statusFilter === status ? config.color : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: statusFilter === status ? '600' : '400'
            }}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <FiShoppingBag size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p>No orders found.</p>
          <p style={{ fontSize: '13px' }}>
            {activeTab === 'buyer'
              ? 'When you order a service, it will appear here.'
              : 'When someone orders your service, it will appear here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {orders.map(order => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG['Created'];
            const StatusIcon = config.icon;
            const otherUser = activeTab === 'buyer' ? order.seller : order.buyer;

            return (
              <div
                key={order._id}
                onClick={() => handleViewOrder(order)}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>{order.title}</h3>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: config.color,
                      background: config.bg
                    }}>
                      <StatusIcon size={12} />
                      {config.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span>
                      {activeTab === 'buyer' ? 'Seller' : 'Buyer'}: <strong>{otherUser?.name || 'Unknown'}</strong>
                    </span>
                    <span>{formatDate(order.createdAt)}</span>
                    {order.workspace && <span>Workspace: {order.workspace?.name}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-500)' }}>
                    {formatCurrency(order.price, order.currency)}
                  </div>
                  {order.escrow?.funded && order.status !== 'Cancelled' && order.status !== 'Accepted' && (
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '500' }}>
                      <FiDollarSign size={10} /> In Escrow
                    </div>
                  )}
                </div>
                <FiArrowRight size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <button
            onClick={() => fetchOrders(pagination.page - 1)}
            disabled={pagination.page <= 1}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: pagination.page <= 1 ? 'var(--bg-secondary)' : 'var(--card)',
              cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
              opacity: pagination.page <= 1 ? 0.5 : 1
            }}
          >
            Previous
          </button>
          <span style={{ padding: '8px 16px', alignSelf: 'center', fontSize: '14px' }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => fetchOrders(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: pagination.page >= pagination.pages ? 'var(--bg-secondary)' : 'var(--card)',
              cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
              opacity: pagination.page >= pagination.pages ? 0.5 : 1
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Order Detail Modal */}
      {isDetailOpen && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          currentUser={user}
          onClose={() => { setIsDetailOpen(false); setSelectedOrder(null); }}
          onUpdate={handleOrderUpdate}
        />
      )}
    </div>
  );
};

export default OrdersPage;