import React, { useState, useEffect } from 'react';
import api from '../services/api';

const HireModal = ({ talentId, talentName, onClose }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [role, setRole] = useState('Contractor');
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

        // Check if response is an array or wrapped in an object
        const workspacesArray = Array.isArray(res.data) ? res.data : (res.data.data || []);

        // Filter workspaces where user is Admin
        const adminWorkspaces = workspacesArray.filter(ws =>
          ws.members?.some(m => String(m.user) === String(userId) && m.role === 'Admin')
        );
        setWorkspaces(adminWorkspaces);
      } catch (err) {
        console.error('[DEBUG HireModal] Error fetching workspaces:', err);
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
      await api.post('/hires', {
        userId: talentId,
        workspaceId: selectedWorkspace,
        projectId: selectedProject,
        role,
        message
      });
      alert(`Hire invitation sent to ${talentName}!`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to send hire invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content hire-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Hire {talentName}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="hire-form">
          {fetching ? (
            <p>Loading workspaces...</p>
          ) : (
            <>
              <div className="form-group">
                <label>Workspace *</label>
                <select
                  value={selectedWorkspace}
                  onChange={(e) => {
                    setSelectedWorkspace(e.target.value);
                    setSelectedProject('');
                  }}
                  required
                >
                  <option value="">Select a workspace</option>
                  {workspaces.map(ws => (
                    <option key={ws._id} value={ws._id}>{ws.name}</option>
                  ))}
                </select>
            {workspaces.length === 0 && !fetching && (
              <p className="form-hint" style={{ color: 'var(--danger-500)', marginTop: '0.5rem' }}>
                No admin workspaces found. You must be an Admin of a workspace to send hire invitations.
              </p>
            )}
              </div>

              {selectedWorkspace && (
                <div className="form-group">
                  <label>Project *</label>
                  {projects.length === 0 ? (
                    <p className="form-hint" style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      No projects found in this workspace. Create a project first.
                    </p>
                  ) : (
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      required
                    >
                      <option value="">Select a project</option>
                      {projects.map(proj => (
                        <option key={proj._id} value={proj._id}>{proj.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Contractor">Contractor</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>

              <div className="form-group">
                <label>Personal Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi! We'd love you to join our project..."
                  maxLength={500}
                  rows={3}
                />
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Hire Invitation'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default HireModal;
