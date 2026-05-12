import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AcceptProposalModal = ({ proposal, job, onClose, onSuccess }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch workspaces where user is Admin
    api.get('/workspaces')
      .then(res => {
        const ws = res.data.data || res.data || [];
        // Filter to workspaces where user is Admin
        const adminWorkspaces = ws.filter(w =>
          w.members?.some(m => m.role === 'Admin')
        );
        setWorkspaces(adminWorkspaces);
        if (adminWorkspaces.length === 1) {
          setSelectedWorkspace(adminWorkspaces[0]._id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedWorkspace) {
      setProjects([]);
      setSelectedProject('');
      return;
    }
    api.get(`/workspaces/${selectedWorkspace}/projects`)
      .then(res => {
        const projs = res.data.data || res.data || [];
        setProjects(projs);
        if (projs.length === 1) {
          setSelectedProject(projs[0]._id);
        }
      })
      .catch(() => {
        setProjects([]);
      });
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
      const res = await api.patch(`/proposals/${proposal._id}/accept`, {
        workspaceId: selectedWorkspace,
        projectId: selectedProject,
        message: message || undefined
      });
      alert(res.data.msg || 'Proposal accepted successfully!');
      onSuccess(res.data.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to accept proposal');
    } finally {
      setLoading(false);
    }
  };

  const freelancer = proposal.freelancer || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Accept Proposal</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Proposal Summary */}
          <div style={{
            background: 'var(--bg-secondary, #f8fafc)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              {freelancer.avatar ? (
                <img src={freelancer.avatar} alt={freelancer.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--primary-500, #6366f1)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: '1rem'
                }}>
                  {freelancer.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600 }}>{freelancer.name || 'Unknown'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {freelancer.totalCompletedProjects || 0} projects completed · {freelancer.ratingAverage?.toFixed(1) || '0.0'} ★
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Proposed Price</div>
                <div style={{ fontWeight: 600, color: 'var(--token-gold, #f59e0b)' }}>
                  {proposal.proposedPrice} {proposal.currency || 'HT'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delivery Time</div>
                <div style={{ fontWeight: 600 }}>{proposal.deliveryDays} days</div>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Select Workspace *</label>
              <select
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
                className="form-input"
                required
              >
                <option value="">Choose a workspace...</option>
                {workspaces.map(ws => (
                  <option key={ws._id} value={ws._id}>{ws.name}</option>
                ))}
              </select>
              {workspaces.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--danger-500)', marginTop: 4 }}>
                  You are not an admin of any workspace. Create a workspace first to hire freelancers.
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Select Project *</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="form-input"
                required
                disabled={!selectedWorkspace}
              >
                <option value="">Choose a project...</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
              {selectedWorkspace && projects.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  No projects found. Create a project in this workspace first.
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Welcome Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a welcome message for the freelancer..."
                rows={3}
                className="form-input"
                maxLength={500}
              />
            </div>

            <div style={{
              background: 'var(--bg-secondary, #f8fafc)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              <strong>What happens next:</strong>
              <ul style={{ margin: '0.5rem 0 0 1.25rem', lineHeight: 1.6 }}>
                <li>The freelancer will receive a hire invitation to join your workspace</li>
                <li>Once they accept, they'll be added to the project as a Contractor</li>
                <li>All other pending proposals for this job will be automatically rejected</li>
                <li>The job status will change to "Filled"</li>
              </ul>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !selectedWorkspace || !selectedProject}
              >
                {loading ? 'Accepting...' : '✓ Accept Proposal & Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AcceptProposalModal;