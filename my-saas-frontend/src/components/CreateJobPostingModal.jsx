import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { SKILL_OPTIONS } from '../constants/skills';

const CreateJobPostingModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subCategory: '',
    tags: [],
    experienceLevel: 'Mid',
    projectType: 'One-time',
    skills: [],
    budget: { min: '', max: '', currency: 'HT' },
    deadline: '',
    visibility: 'Public',
    workspaceId: '',
    projectId: ''
  });
  const [newSkill, setNewSkill] = useState('');
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await api.get('/workspaces/my');
        const adminWorkspaces = (res.data.data || res.data || []).filter(
          ws => ws.members?.some(m => m.role === 'Admin')
        );
        setWorkspaces(adminWorkspaces);
      } catch (err) {
        console.error('Failed to fetch workspaces:', err);
      }
    };
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (!formData.workspaceId) {
      setProjects([]);
      return;
    }
    const fetchProjects = async () => {
      try {
        const res = await api.get(`/workspaces/${formData.workspaceId}/projects`);
        setProjects(res.data.data || res.data || []);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
        setProjects([]);
      }
    };
    fetchProjects();
  }, [formData.workspaceId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBudgetChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      budget: { ...prev.budget, [name]: value }
    }));
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

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (formData.tags.includes(trimmed)) return;
    setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        budget: {
          min: formData.budget.min ? Number(formData.budget.min) : 0,
          max: formData.budget.max ? Number(formData.budget.max) : undefined,
          currency: formData.budget.currency
        }
      };

      // Only include workspace/project for workspace visibility
      if (formData.visibility !== 'Workspace') {
        delete payload.workspaceId;
        delete payload.projectId;
      }

      const res = await api.post('/jobs', payload);
      toast.success('Job posted successfully!');
      onSuccess(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to create job posting');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Design', 'Development', 'Writing', 'Marketing',
    'Video & Animation', 'Music & Audio', 'Business', 'Data'
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Post a New Job</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Job Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Need a React Developer for E-commerce Site"
              required
              maxLength={150}
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the project, requirements, and deliverables in detail..."
              required
              rows={5}
              maxLength={5000}
            />
            <span className="char-count">{formData.description.length}/5000</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select name="category" value={formData.category} onChange={handleChange} required>
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Sub-Category</label>
              <input
                type="text"
                name="subCategory"
                value={formData.subCategory}
                onChange={handleChange}
                placeholder="e.g., E-commerce, Landing Page"
              />
            </div>

            <div className="form-group">
              <label>Visibility</label>
              <select name="visibility" value={formData.visibility} onChange={handleChange}>
                <option value="Public">🌍 Public</option>
                <option value="Workspace">🔒 Workspace Only</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Experience Level</label>
              <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange}>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid-Level</option>
                <option value="Senior">Senior</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div className="form-group">
              <label>Project Type</label>
              <select name="projectType" value={formData.projectType} onChange={handleChange}>
                <option value="One-time">One-time</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Complex">Complex</option>
              </select>
            </div>
          </div>

          {formData.visibility === 'Workspace' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Workspace *</label>
                  <select name="workspaceId" value={formData.workspaceId} onChange={handleChange} required>
                    <option value="">Select workspace</option>
                    {workspaces.map(ws => (
                      <option key={ws._id} value={ws._id}>{ws.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Project (Optional)</label>
                  <select name="projectId" value={formData.projectId} onChange={handleChange} disabled={!formData.workspaceId}>
                    <option value="">Select project</option>
                    {projects.map(proj => (
                      <option key={proj._id} value={proj._id}>{proj.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="alert alert-info" style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
                ℹ️ Workspace jobs require admin approval before they appear in the marketplace.
              </div>
            </>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Budget Min</label>
              <input
                type="number"
                name="min"
                value={formData.budget.min}
                onChange={handleBudgetChange}
                placeholder="0"
                min={0}
              />
            </div>

            <div className="form-group">
              <label>Budget Max *</label>
              <input
                type="number"
                name="max"
                value={formData.budget.max}
                onChange={handleBudgetChange}
                placeholder="e.g., 1000"
                required
                min={0}
              />
            </div>

            <div className="form-group">
              <label>Currency</label>
              <select name="currency" value={formData.budget.currency} onChange={handleBudgetChange}>
                <option value="HT">Hive Tokens (HT)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Deadline</label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Tags (Custom)</label>
            <div className="skill-input-row">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Add custom tags..."
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddTag}>
                Add
              </button>
            </div>
            <div className="skill-tags">
              {formData.tags.map(tag => (
                <span key={tag} className="skill-tag" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Skills Required</label>
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

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Posting...' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJobPostingModal;
