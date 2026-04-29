import React, { useState, useEffect } from 'react';
import { FiLayout, FiTrash2, FiUsers, FiCalendar, FiSearch } from 'react-icons/fi';
import api from '../services/api';

const AdminWorkspacesPage = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/workspaces');
      setWorkspaces(res.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId) => {
    if (!window.confirm('Are you sure you want to delete this workspace? All projects and tasks within it will be lost. This cannot be undone.')) return;
    
    try {
      setActionLoading(true);
      await api.delete(`/admin/workspaces/${workspaceId}`);
      setWorkspaces(workspaces.filter(w => w._id !== workspaceId));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete workspace');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredWorkspaces = workspaces.filter(w => 
    w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="admin-page-container"><div className="loading-spinner"></div></div>;
  if (error) return <div className="admin-page-container"><div className="error-message">{error}</div></div>;

  return (
    <div className="admin-page-container">
      <header className="admin-page-header">
        <div className="admin-header-icon"><FiLayout /></div>
        <div>
          <h1>Workspace Management</h1>
          <p>View and manage all workspaces on the platform</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="admin-search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-search-input"
          />
        </div>
        <div className="admin-toolbar-info">
          {filteredWorkspaces.length} workspace{filteredWorkspaces.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Members</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkspaces.map((workspace) => (
              <tr key={workspace._id}>
                <td>
                  <div className="workspace-cell">
                    <div className="workspace-icon">{workspace.name?.charAt(0)?.toUpperCase() || 'W'}</div>
                    <span>{workspace.name}</span>
                  </div>
                </td>
                <td><span className="text-muted">{workspace.description || 'No description'}</span></td>
                <td>
                  <span className="member-count">
                    <FiUsers style={{ marginRight: '4px' }} />
                    {workspace.members?.length || 0} member{workspace.members?.length !== 1 ? 's' : ''}
                  </span>
                </td>
                <td>
                  <span className="date-cell">
                    <FiCalendar style={{ marginRight: '4px' }} />
                    {new Date(workspace.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleDeleteWorkspace(workspace._id)}
                      className="btn btn-icon btn-danger"
                      title="Delete Workspace"
                      disabled={actionLoading}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminWorkspacesPage;
