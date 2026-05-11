import React, { useState } from 'react';
import api from '../services/api';
import { SKILL_OPTIONS } from '../constants/skills';

const CreateServicePackageModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    skills: [],
    price: '',
    currency: 'HT',
    deliveryDays: '',
    revisions: 0,
    features: ['']
  });
  const [newSkill, setNewSkill] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    if (formData.skills.includes(trimmed)) return;
    if (!SKILL_OPTIONS.includes(trimmed)) return;
    setFormData(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleFeatureChange = (index, value) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures[index] = value;
    setFormData(prev => ({ ...prev, features: updatedFeatures }));
  };

  const handleAddFeature = () => {
    setFormData(prev => ({ ...prev, features: [...prev.features, ''] }));
  };

  const handleRemoveFeature = (index) => {
    if (formData.features.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        deliveryDays: Number(formData.deliveryDays),
        revisions: Number(formData.revisions),
        features: formData.features.filter(f => f.trim() !== '')
      };

      const res = await api.post('/services', payload);
      onSuccess(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to create service package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Service Package</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Professional Logo Design"
              required
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what you offer in detail..."
              required
              rows={4}
              maxLength={2000}
            />
            <span className="char-count">{formData.description.length}/2000</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g., Design, Development, Writing"
                required
              />
            </div>

            <div className="form-group">
              <label>Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange}>
                <option value="HT">Hive Tokens (HT)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
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
                placeholder="e.g., 3"
                required
                min={1}
              />
            </div>

            <div className="form-group">
              <label>Revisions</label>
              <input
                type="number"
                name="revisions"
                value={formData.revisions}
                onChange={handleChange}
                placeholder="e.g., 2"
                min={0}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Skills</label>
            <div className="skill-input-row">
              <input
                type="text"
                list="skill-options"
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                placeholder="Type to search skills..."
              />
              <datalist id="skill-options">
                {SKILL_OPTIONS.map(skill => (
                  <option key={skill} value={skill} />
                ))}
              </datalist>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddSkill}>
                Add
              </button>
            </div>
            <div className="skill-tags">
              {formData.skills.map(skill => (
                <span key={skill} className="skill-tag">
                  {skill}
                  <button type="button" onClick={() => handleRemoveSkill(skill)}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Features</label>
            {formData.features.map((feature, index) => (
              <div key={index} className="feature-input-row">
                <input
                  type="text"
                  value={feature}
                  onChange={e => handleFeatureChange(index, e.target.value)}
                  placeholder={`Feature ${index + 1}`}
                />
                <button
                  type="button"
                  className="btn btn-icon btn-danger"
                  onClick={() => handleRemoveFeature(index)}
                  disabled={formData.features.length <= 1}
                >
                  &minus;
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddFeature}>
              + Add Feature
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Service Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateServicePackageModal;
