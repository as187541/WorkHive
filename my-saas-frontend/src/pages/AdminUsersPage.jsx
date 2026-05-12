import React, { useState, useEffect } from 'react';
import { FiUsers, FiTrash2, FiSearch, FiShield, FiUser, FiAward } from 'react-icons/fi';
import api from '../services/api';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      setActionLoading(true);
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="admin-page-container"><div className="loading-spinner"></div></div>;
  if (error) return <div className="admin-page-container"><div className="error-message">{error}</div></div>;

  return (
    <div className="admin-page-container">
      <header className="admin-page-header">
        <div className="admin-header-icon"><FiUsers /></div>
        <div>
          <h1>User Management</h1>
          <p>Manage platform users, roles, and token balances</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="admin-search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-search-input"
          />
        </div>
        <div className="admin-toolbar-info">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Wallet Balance</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id}>
                <td>
                  <div className="user-cell">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="user-avatar-sm" />
                    ) : (
                      <div className="user-avatar-placeholder"><FiUser /></div>
                    )}
                    <span>{user.name}</span>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                    disabled={actionLoading}
                    className={`role-badge ${user.role.toLowerCase()}`}
                  >
                    <option value="User">User</option>
                    <option value="SuperAdmin">SuperAdmin</option>
                  </select>
                </td>
                <td>
                  <span className="token-balance">
                    <FiAward style={{ marginRight: '4px' }} />
                    {user.wallet?.balance || 0} HT
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleDeleteUser(user._id)}
                      className="btn btn-icon btn-danger"
                      title="Delete User"
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

export default AdminUsersPage;
