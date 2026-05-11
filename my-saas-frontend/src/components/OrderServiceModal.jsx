import React, { useState, useEffect } from 'react';
import api from '../services/api';

const OrderServiceModal = ({ service, onClose, onSuccess }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const userId = storedUser ? JSON.parse(storedUser)._id : null;
        const res = await api.get('/workspaces');

        const workspacesArray = Array.isArray(res.data) ? res.data : (res.data.data || []);

        // Filter workspaces where user is Admin
        const adminWorkspaces = workspacesArray.filter(ws =>
          ws.members?.some(m => String(m.user) === String(userId) && m.role === 'Admin')
        );
        setWorkspaces(adminWorkspaces);
      } catch (err) {
        console.error('Error fetching workspaces:', err);
        setError('Failed to load workspaces');
      } finally {
        setFetching(false);
      }
    };
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (!selectedWorkspace) {
      setProjects([]);
      return;
    }
    const fetchProjects = async () => {
      try {
        const res = await api.get(`/workspaces/${selectedWorkspace}/projects`);
        setProjects(res.data || []);
      } catch (err) {
        setProjects([]);
      }
    };
    fetchProjects();
  }, [selectedWorkspace]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorkspace || !selectedProject) {
      setError('Please select a workspace and project.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.post(`/services/${service._id}/order`, {
        workspaceId: selectedWorkspace,
        projectId: selectedProject,
        message
      });
      alert(res.data.msg || 'Order placed successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const freelancer = service.freelancer || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Order Service</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="order-summary">
          <h4>{service.title}</h4>
          <p>{service.description?.substring(0, 150)}... </p>
          <div className="order-summary-meta">
            <span><strong>Price:</strong> {service.price} {service.currency}</span>
            <span><strong>Delivery:</strong> {service.deliveryDays} days</span>
            <span><strong>Revisions:</strong> {service.revisions}</span>
          </div>
          <div className="order-freelancer">
            <span>By: {freelancer.name || 'Unknown'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Workspace *</label>
            <select
              value={selectedWorkspace}
              onChange={e => {
                setSelectedWorkspace(e.target.value);
                setSelectedProject('');
              }}
              required
              disabled={fetching}
            >
              <option value="">{fetching ? 'Loading...' : 'Select a workspace'}</option>
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>{ws.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Project *</label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              required
              disabled={!selectedWorkspace}
            >
              <option value="">{selectedWorkspace ? 'Select a project' : 'Select a workspace first'}</option>
              {projects.map(proj => (
                <option key={proj._id} value={proj._id}>{proj.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Message (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add any specific requirements or questions..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Placing Order...' : `Order for ${service.price} ${service.currency}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderServiceModal;
