import React, { useState, useEffect } from 'react';
import { FiAward, FiUsers, FiTrash2, FiEdit3, FiPlus, FiMinus, FiSearch, FiShield, FiUser } from 'react-icons/fi';
import api from '../services/api';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [tokenAmount, setTokenAmount] = useState('');
  const [tokenReason, setTokenReason] = useState('');
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

  const openTokenModal = (user) => {
    setSelectedUser(user);
    setTokenAmount('');
    setTokenReason('');
    setShowTokenModal(true);
  };

  const handleTokenAlter = async () => {
    if (!tokenAmount || isNaN(tokenAmount)) {
      alert('Please enter a valid number');
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/admin/users/${selectedUser._id}/tokens`, {
        amount: Number(tokenAmount),
        reason: tokenReason || 'Admin adjustment'
      });
      
      // Update local state
      setUsers(users.map(u => {
        if (u._id === selectedUser._id) {
          return {
            ...u,
            wallet: {
              ...u.wallet,
              balance: (u.wallet?.balance || 0) + Number(tokenAmount)
            }
          };
        }
        return u;
      }));
      
      setShowTokenModal(false);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to alter tokens');
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
                      onClick={() => openTokenModal(user)}
                      className="btn btn-icon btn-token"
                      title="Alter Tokens"
                      disabled={actionLoading}
                    >
                      <FiEdit3 />
                    </button>
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

      {/* Token Alter Modal */}
      {showTokenModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Alter Tokens for {selectedUser.name}</h3>
              <button onClick={() => setShowTokenModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p className="current-balance">
                Current Balance: <strong>{selectedUser.wallet?.balance || 0} HT</strong>
              </p>
              <div className="form-group">
                <label>Amount (use negative to deduct)</label>
                <div className="token-input-group">
                  <button 
                    onClick={() => setTokenAmount(prev => String((Number(prev) || 0) - 10))}
                    className="btn btn-sm"
                  >
                    <FiMinus /> 10
                  </button>
                  <input
                    type="number"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(e.target.value)}
                    placeholder="e.g. 100 or -50"
                    className="form-input"
                  />
                  <button 
                    onClick={() => setTokenAmount(prev => String((Number(prev) || 0) + 10))}
                    className="btn btn-sm"
                  >
                    <FiPlus /> 10
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Reason (optional)</label>
                <input
                  type="text"
                  value={tokenReason}
                  onChange={(e) => setTokenReason(e.target.value)}
                  placeholder="e.g. Bug bounty reward"
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowTokenModal(false)} className="btn btn-secondary">Cancel</button>
              <button 
                onClick={handleTokenAlter} 
                className="btn btn-primary"
                disabled={actionLoading || !tokenAmount}
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
