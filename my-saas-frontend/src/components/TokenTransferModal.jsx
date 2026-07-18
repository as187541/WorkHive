import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const TokenTransferModal = ({ workspace, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    recipientId: '',
    amount: '',
    reason: ''
  });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [myBalance, setMyBalance] = useState(0);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // Use the dedicated members endpoint which populates user data
        const membersRes = await api.get(`/workspaces/${workspace._id}/members`);
        const membersList = membersRes.data || [];
        
        const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')._id;
        const otherMembers = membersList.filter(
          m => String(m.user?._id || m.user) !== String(currentUserId)
        );
        setMembers(otherMembers);

        // Get my balance in this workspace - getMe returns data directly, not nested
        const userRes = await api.get('/auth/me');
        const user = userRes.data;
        const wsEntry = user.wallet?.workspaces?.find(
          w => String(w.workspace) === String(workspace._id)
        );
        setMyBalance(wsEntry?.balance || 0);
      } catch (err) {
        console.error('Failed to fetch workspace members:', err);
      }
    };
    fetchMembers();
  }, [workspace._id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/transfers', {
        recipientId: formData.recipientId,
        workspaceId: workspace._id,
        amount: Number(formData.amount),
        reason: formData.reason
      });
      toast.success(res.data.msg || 'Transfer successful!');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to transfer tokens');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Transfer Tokens</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="balance-info" style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem' }}>
          <span>Your Balance: <strong>{myBalance} HT</strong></span>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Recipient *</label>
            <select
              name="recipientId"
              value={formData.recipientId}
              onChange={handleChange}
              required
            >
              <option value="">Select member</option>
              {members.map(member => (
                <option key={member.user?._id || member.user} value={member.user?._id || member.user}>
                  {member.user?.name || 'Unknown'} ({member.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Amount (HT) *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="e.g., 100"
              required
              min={1}
              max={myBalance}
            />
          </div>

          <div className="form-group">
            <label>Reason (Optional)</label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="e.g., Bonus for great work"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TokenTransferModal;
