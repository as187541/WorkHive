import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const CounterOfferModal = ({ proposal, job, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    proposedPrice: proposal.proposedPrice || '',
    deliveryDays: proposal.deliveryDays || '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/proposals/${proposal._id}/counter-offer`, {
        proposedPrice: Number(formData.proposedPrice),
        deliveryDays: Number(formData.deliveryDays),
        message: formData.message
      });
      toast.success('Counter-offer sent successfully!');
      onSuccess(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to send counter-offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Send Counter-Offer</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="proposal-summary" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem' }}>
          <h4>{job.title}</h4>
          <p>Current proposal: {proposal.proposedPrice} {proposal.currency}, {proposal.deliveryDays} days</p>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Your Price *</label>
              <input
                type="number"
                name="proposedPrice"
                value={formData.proposedPrice}
                onChange={handleChange}
                placeholder="e.g., 500"
                required
                min={0}
              />
            </div>

            <div className="form-group">
              <label>Delivery Days *</label>
              <input
                type="number"
                name="deliveryDays"
                value={formData.deliveryDays}
                onChange={handleChange}
                placeholder="e.g., 7"
                required
                min={1}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Message (Optional)</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Explain your counter-offer..."
              rows={3}
              maxLength={1000}
            />
            <span className="char-count">{formData.message.length}/1000</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Counter-Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CounterOfferModal;
