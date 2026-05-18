// src/components/OrderDetailModal.jsx
import React, { useState } from 'react';
import {
  FiX, FiDollarSign, FiCheck, FiRefreshCw, FiAlertTriangle,
  FiMessageSquare, FiFileText, FiClock, FiUser, FiPackage
} from 'react-icons/fi';
import api from '../services/api';
import DisputeModal from './DisputeModal';

const STATUS_CONFIG = {
  'Created': { color: '#6b7280', bg: '#f3f4f6', label: 'Awaiting Funding', actions: ['fund', 'cancel'] },
  'Funded': { color: '#3b82f6', bg: '#eff6ff', label: 'Funded — Awaiting Start', actions: ['cancel'] },
  'In Progress': { color: '#f59e0b', bg: '#fffbeb', label: 'In Progress', actions: ['deliver', 'dispute'] },
  'Delivered': { color: '#8b5cf6', bg: '#f5f3ff', label: 'Delivered — Awaiting Review', actions: ['accept', 'revision', 'dispute'] },
  'Revision': { color: '#f97316', bg: '#fff7ed', label: 'Revision Requested', actions: ['deliver', 'dispute'] },
  'Accepted': { color: '#10b981', bg: '#ecfdf5', label: 'Completed', actions: ['invoice'] },
  'Disputed': { color: '#ef4444', bg: '#fef2f2', label: 'Under Dispute', actions: [] },
  'Cancelled': { color: '#9ca3af', bg: '#f9fafb', label: 'Cancelled', actions: [] }
};

const OrderDetailModal = ({ order, currentUser, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [noteMessage, setNoteMessage] = useState('');
  const [showDispute, setShowDispute] = useState(false);
  const [error, setError] = useState(null);

  const isBuyer = order.buyer?._id === currentUser?._id || order.buyer === currentUser?._id;
  const isSeller = order.seller?._id === currentUser?._id || order.seller === currentUser?._id;
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG['Created'];

  const formatCurrency = (amount, currency) => {
    return currency === 'USD' ? `$${amount.toFixed(2)}` : `${amount} HT`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleAction = async (action, data = {}) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint;
      switch (action) {
        case 'fund': endpoint = `/orders/${order._id}/fund`; break;
        case 'start': endpoint = `/orders/${order._id}/start`; break;
        case 'accept': endpoint = `/orders/${order._id}/accept`; break;
        case 'deliver': endpoint = `/orders/${order._id}/deliver`; break;
        case 'revision': endpoint = `/orders/${order._id}/revision`; break;
        case 'cancel': endpoint = `/orders/${order._id}/cancel`; break;
        default: return;
      }

      const method = action === 'fund' || action === 'deliver' ? 'post' : 'patch';
      const res = method === 'post'
        ? await api.post(endpoint, data)
        : await api.patch(endpoint, data);

      if (res.data.success !== false) {
        onUpdate();
      } else {
        setError(res.data.msg || 'Action failed');
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteMessage.trim()) return;
    setLoading(true);
    try {
      await api.post(`/orders/${order._id}/notes`, { message: noteMessage.trim() });
      setNoteMessage('');
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async (reason) => {
    setLoading(true);
    try {
      const res = await api.post(`/orders/${order._id}/dispute`, { reason });
      if (res.data.success !== false) {
        setShowDispute(false);
        onUpdate();
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to open dispute');
    } finally {
      setLoading(false);
    }
  };

  const otherUser = isBuyer ? order.seller : order.buyer;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>{order.title}</h2>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              color: config.color,
              background: config.bg,
              marginTop: '8px'
            }}>
              {config.label}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

        {/* Order Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {isBuyer ? 'Seller' : 'Buyer'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiUser size={16} />
              <span style={{ fontWeight: '600' }}>{otherUser?.name || 'Unknown'}</span>
            </div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Order Price</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-500)' }}>
              {formatCurrency(order.price, order.currency)}
            </div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Delivery Time</div>
            <div style={{ fontWeight: '600' }}>{order.deliveryDays} days</div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Revisions Remaining</div>
            <div style={{ fontWeight: '600' }}>{order.revisionsRemaining} / {order.revisions}</div>
          </div>
        </div>

        {/* Escrow Info */}
        {order.escrow?.funded && (
          <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '8px', marginBottom: '24px', border: '1px solid #a7f3d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FiDollarSign size={18} style={{ color: '#10b981' }} />
              <strong style={{ color: '#065f46' }}>Escrow Funded</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#065f46' }}>
              <span>{formatCurrency(order.escrow.amount, order.currency)} held in escrow</span>
              <span style={{ marginLeft: '16px' }}>Funded: {formatDate(order.escrow.fundedAt)}</span>
            </div>
            {order.status === 'Accepted' && order.escrow.releasedAt && (
              <div style={{ fontSize: '13px', color: '#065f46', marginTop: '4px' }}>
                Released: {formatDate(order.escrow.releasedAt)}
              </div>
            )}
          </div>
        )}

        {/* Financial Breakdown */}
        {order.status === 'Accepted' && (
          <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>Financial Breakdown</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
              <span>Order Total:</span>
              <strong>{formatCurrency(order.price, order.currency)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px', color: '#ef4444' }}>
              <span>Platform Fee (10%):</span>
              <strong>-{formatCurrency(order.platformFee, order.currency)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
              <span>Seller Payout:</span>
              <strong style={{ color: '#10b981' }}>{formatCurrency(order.sellerPayout, order.currency)}</strong>
            </div>
          </div>
        )}

        {/* Delivery Info */}
        {order.delivery?.deliveredAt && (
          <div style={{ padding: '16px', background: '#f5f3ff', borderRadius: '8px', marginBottom: '24px', border: '1px solid #ddd6fe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FiPackage size={18} style={{ color: '#8b5cf6' }} />
              <strong style={{ color: '#5b21b6' }}>Delivery Submitted</strong>
            </div>
            <p style={{ fontSize: '13px', color: '#5b21b6', margin: 0 }}>{order.delivery.message}</p>
            <div style={{ fontSize: '12px', color: '#7c3aed', marginTop: '4px' }}>
              Delivered: {formatDate(order.delivery.deliveredAt)}
            </div>
          </div>
        )}

        {/* Dispute Info */}
        {order.dispute?.status !== 'None' && (
          <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px', marginBottom: '24px', border: '1px solid #fecaca' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FiAlertTriangle size={18} style={{ color: '#ef4444' }} />
              <strong style={{ color: '#991b1b' }}>Dispute: {order.dispute.status}</strong>
            </div>
            <p style={{ fontSize: '13px', color: '#991b1b', margin: '0 0 4px 0' }}>
              <strong>Reason:</strong> {order.dispute.reason}
            </p>
            {order.dispute.resolution && (
              <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                <strong>Resolution:</strong> {order.dispute.resolution}
              </p>
            )}
          </div>
        )}

        {/* Description */}
        {order.description && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '8px' }}>Description</h4>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{order.description}</p>
          </div>
        )}

        {/* Features */}
        {order.features && order.features.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '8px' }}>Features</h4>
            <ul style={{ paddingLeft: '20px', fontSize: '14px' }}>
              {order.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}

        {/* Milestones */}
        {order.milestones && order.milestones.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '8px' }}>Milestones</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {order.milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '14px' }}>
                  <span>{m.title}</span>
                  <span style={{ fontWeight: '600' }}>{formatCurrency(m.amount, order.currency)}</span>
                  <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '10px', background: m.status === 'Approved' ? '#ecfdf5' : m.status === 'Submitted' ? '#eff6ff' : '#f3f4f6', color: m.status === 'Approved' ? '#10b981' : m.status === 'Submitted' ? '#3b82f6' : '#6b7280' }}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '8px' }}>Timeline</h4>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div><FiClock size={12} style={{ marginRight: '6px' }} />Created: {formatDate(order.createdAt)}</div>
            {order.fundedAt && <div><FiDollarSign size={12} style={{ marginRight: '6px' }} />Funded: {formatDate(order.fundedAt)}</div>}
            {order.delivery?.deliveredAt && <div><FiPackage size={12} style={{ marginRight: '6px' }} />Delivered: {formatDate(order.delivery.deliveredAt)}</div>}
            {order.acceptedAt && <div><FiCheck size={12} style={{ marginRight: '6px' }} />Accepted: {formatDate(order.acceptedAt)}</div>}
            {order.cancelledAt && <div><FiX size={12} style={{ marginRight: '6px' }} />Cancelled: {formatDate(order.cancelledAt)}</div>}
            {order.deadline && <div><FiClock size={12} style={{ marginRight: '6px' }} />Deadline: {formatDate(order.deadline)}</div>}
          </div>
        </div>

        {/* Notes */}
        {order.notes && order.notes.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '8px' }}><FiMessageSquare style={{ marginRight: '6px' }} />Notes</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {order.notes.map((note, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '12px' }}>{note.author?.name || 'User'}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(note.createdAt)}</span>
                  </div>
                  <div>{note.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Note */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Add a note..."
              value={noteMessage}
              onChange={(e) => setNoteMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)' }}
            />
            <button
              onClick={handleAddNote}
              disabled={loading || !noteMessage.trim()}
              style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--primary-500)', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              Send
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isBuyer && order.status === 'Created' && (
            <button
              onClick={() => handleAction('fund')}
              disabled={loading}
              style={{ padding: '10px 20px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            >
              <FiDollarSign style={{ marginRight: '6px' }} /> Fund Order ({formatCurrency(order.price, order.currency)})
            </button>
          )}
          {isSeller && order.status === 'Funded' && (
            <button
              onClick={() => handleAction('start')}
              disabled={loading}
              style={{ padding: '10px 20px', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            >
              <FiPackage style={{ marginRight: '6px' }} /> Start Working
            </button>
          )}
          {isSeller && (order.status === 'In Progress' || order.status === 'Revision') && (
            <button
              onClick={() => handleAction('deliver', { message: 'Deliverables submitted.' })}
              disabled={loading}
              style={{ padding: '10px 20px', borderRadius: '8px', background: '#8b5cf6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            >
              <FiCheck style={{ marginRight: '6px' }} /> Submit Delivery
            </button>
          )}
          {isBuyer && order.status === 'Delivered' && (
            <>
              <button
                onClick={() => handleAction('accept')}
                disabled={loading}
                style={{ padding: '10px 20px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                <FiCheck style={{ marginRight: '6px' }} /> Accept Delivery
              </button>
              {order.revisionsRemaining > 0 && (
                <button
                  onClick={() => {
                    const msg = prompt('What would you like changed?');
                    if (msg) handleAction('revision', { message: msg });
                  }}
                  disabled={loading}
                  style={{ padding: '10px 20px', borderRadius: '8px', background: '#f97316', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                >
                  <FiRefreshCw style={{ marginRight: '6px' }} /> Request Revision ({order.revisionsRemaining} left)
                </button>
              )}
            </>
          )}
          {(order.status === 'In Progress' || order.status === 'Delivered') && (
            <button
              onClick={() => setShowDispute(true)}
              disabled={loading}
              style={{ padding: '10px 20px', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            >
              <FiAlertTriangle style={{ marginRight: '6px' }} /> Open Dispute
            </button>
          )}
          {(order.status === 'Created' || order.status === 'Funded') && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this order?')) {
                  handleAction('cancel', { reason: 'Cancelled by user' });
                }
              }}
              disabled={loading}
              style={{ padding: '10px 20px', borderRadius: '8px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: '600' }}
            >
              Cancel Order
            </button>
          )}
          {order.status === 'Accepted' && (
            <button
              onClick={async () => {
                try {
                  const res = await api.get(`/orders/${order._id}/invoice`);
                  const invoiceWindow = window.open('', '_blank');
                  invoiceWindow.document.write(`<pre>${JSON.stringify(res.data.data, null, 2)}</pre>`);
                  invoiceWindow.document.title = `Invoice ${res.data.data.invoiceNumber}`;
                } catch (err) {
                  setError(err.response?.data?.msg || 'Failed to load invoice');
                }
              }}
              style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--primary-500)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            >
              <FiFileText style={{ marginRight: '6px' }} /> View Invoice
            </button>
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      {showDispute && (
        <DisputeModal
          orderTitle={order.title}
          onSubmit={handleDispute}
          onClose={() => setShowDispute(false)}
        />
      )}
    </div>
  );
};

export default OrderDetailModal;