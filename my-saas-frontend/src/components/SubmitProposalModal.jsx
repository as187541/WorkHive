import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const SubmitProposalModal = ({ job, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    coverLetter: '',
    proposedPrice: job?.budget?.max || '',
    currency: job?.budget?.currency || 'HT',
    deliveryDays: ''
  });
  const [milestones, setMilestones] = useState([]);
  const [showMilestones, setShowMilestones] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addMilestone = () => {
    setMilestones(prev => [...prev, { title: '', description: '', amount: 0, dueDate: '' }]);
  };

  const removeMilestone = (index) => {
    setMilestones(prev => prev.filter((_, i) => i !== index));
  };

  const updateMilestone = (index, field, value) => {
    setMilestones(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate milestone totals don't exceed proposed price
    if (milestones.length > 0 && totalMilestoneAmount > Number(formData.proposedPrice)) {
      setError(`Milestone total (${totalMilestoneAmount}) exceeds your proposed price (${formData.proposedPrice}).`);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        coverLetter: formData.coverLetter,
        proposedPrice: Number(formData.proposedPrice),
        currency: formData.currency,
        deliveryDays: Number(formData.deliveryDays),
        milestones: milestones.filter(m => m.title.trim()).map(m => ({
          ...m,
          amount: Number(m.amount),
          dueDate: m.dueDate || undefined
        }))
      };
      const res = await api.post(`/proposals/jobs/${job._id}/proposals`, payload);
      toast.success(res.data.msg || 'Proposal submitted successfully!');
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

          {/* Milestone Builder */}
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={showMilestones}
                  onChange={(e) => setShowMilestones(e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                Add Milestones
              </label>
              {showMilestones && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={addMilestone}>
                  + Add Milestone
                </button>
              )}
            </div>
            {showMilestones && milestones.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Total: {totalMilestoneAmount} / {formData.proposedPrice || 0} {formData.currency}
                {totalMilestoneAmount > Number(formData.proposedPrice) && (
                  <span style={{ color: 'var(--danger-500)', marginLeft: '0.5rem' }}>
                    ⚠️ Exceeds proposed price
                  </span>
                )}
              </div>
            )}
            {showMilestones && milestones.map((ms, idx) => (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr 100px 140px 32px',
                gap: '0.5rem',
                alignItems: 'end',
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--border-radius-md)'
              }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Title *</label>
                  <input
                    type="text"
                    value={ms.title}
                    onChange={(e) => updateMilestone(idx, 'title', e.target.value)}
                    placeholder="Milestone name"
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Description</label>
                  <input
                    type="text"
                    value={ms.description}
                    onChange={(e) => updateMilestone(idx, 'description', e.target.value)}
                    placeholder="Brief description"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Amount *</label>
                  <input
                    type="number"
                    value={ms.amount}
                    onChange={(e) => updateMilestone(idx, 'amount', e.target.value)}
                    min={0}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Due Date</label>
                  <input
                    type="date"
                    value={ms.dueDate}
                    onChange={(e) => updateMilestone(idx, 'dueDate', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMilestone(idx)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger-500)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '0.25rem'
                  }}
                  title="Remove milestone"
                >
                  ×
                </button>
              </div>
            ))}
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
