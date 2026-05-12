import React, { useState } from 'react';
import api from '../services/api';

const SubmitProposalModal = ({ job, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    coverLetter: '',
    proposedPrice: job?.budget?.max || '',
    currency: job?.budget?.currency || 'HT',
    deliveryDays: ''
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
      const res = await api.post(`/proposals/jobs/${job._id}/proposals`, {
        coverLetter: formData.coverLetter,
        proposedPrice: Number(formData.proposedPrice),
        currency: formData.currency,
        deliveryDays: Number(formData.deliveryDays)
      });
      alert(res.data.msg || 'Proposal submitted successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to submit proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Submit Proposal</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="proposal-job-summary">
          <h4>{job.title}</h4>
          <p>{job.description?.substring(0, 200)}...</p>
          <div className="proposal-job-meta">
            <span>💰 Budget: {job.budget?.min || 0} - {job.budget?.max} {job.budget?.currency || 'HT'}</span>
            {job.deadline && <span>⏱️ Deadline: {new Date(job.deadline).toLocaleDateString()}</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Cover Letter *</label>
            <textarea
              name="coverLetter"
              value={formData.coverLetter}
              onChange={handleChange}
              placeholder="Introduce yourself, explain why you're a good fit, and describe your approach to this project..."
              required
              rows={5}
              maxLength={3000}
            />
            <span className="char-count">{formData.coverLetter.length}/3000</span>
          </div>

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
              <label>Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange}>
                <option value="HT">Hive Tokens (HT)</option>
                <option value="USD">USD ($)</option>
              </select>
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

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitProposalModal;
