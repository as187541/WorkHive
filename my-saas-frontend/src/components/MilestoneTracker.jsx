import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const STATUS_CONFIG = {
  Pending: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
  Submitted: { label: 'Submitted', color: '#3b82f6', bg: '#eff6ff', icon: '📤' },
  Approved: { label: 'Approved', color: '#10b981', bg: '#ecfdf5', icon: '✅' },
  Rejected: { label: 'Rejected', color: '#ef4444', bg: '#fef2f2', icon: '❌' }
};

const MilestoneTracker = ({ proposal, isFreelancer, onMilestoneUpdate }) => {
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(null);
  const milestones = proposal?.milestones || [];

  if (milestones.length === 0) return null;

  const totalAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const approvedAmount = milestones
    .filter(m => m.status === 'Approved')
    .reduce((sum, m) => sum + (m.amount || 0), 0);
  const progressPercent = totalAmount > 0 ? Math.round((approvedAmount / totalAmount) * 100) : 0;

  const handleSubmit = async (index) => {
    try {
      setActionLoading(`submit-${index}`);
      const res = await api.patch(`/proposals/${proposal._id}/milestones/${index}/submit`);
      toast.success('Milestone submitted for review!');
      onMilestoneUpdate?.(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to submit milestone');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (index) => {
    try {
      setActionLoading(`approve-${index}`);
      const res = await api.patch(`/proposals/${proposal._id}/milestones/${index}/approve`);
      toast.success(res.data.msg || 'Milestone approved!');
      onMilestoneUpdate?.(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to approve milestone');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (index) => {
    try {
      setActionLoading(`reject-${index}`);
      const res = await api.patch(`/proposals/${proposal._id}/milestones/${index}/reject`, {
        reason: rejectReason
      });
      toast.success('Milestone rejected.');
      setShowRejectInput(null);
      setRejectReason('');
      onMilestoneUpdate?.(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to reject milestone');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="milestone-tracker" style={{ marginTop: '1rem' }}>
      <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📋 Milestones
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
          ({milestones.filter(m => m.status === 'Approved').length}/{milestones.length} completed)
        </span>
      </h4>

      {/* Progress Bar */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--border-radius-md)',
        height: '8px',
        marginBottom: '1rem',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(90deg, #10b981, #059669)',
          height: '100%',
          width: `${progressPercent}%`,
          borderRadius: 'var(--border-radius-md)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        {approvedAmount} / {totalAmount} {proposal.currency || 'HT'} released ({progressPercent}%)
      </div>

      {/* Milestone List */}
      {milestones.map((ms, idx) => {
        const config = STATUS_CONFIG[ms.status] || STATUS_CONFIG.Pending;
        const canSubmit = isFreelancer && (ms.status === 'Pending' || ms.status === 'Rejected');
        const canApprove = !isFreelancer && ms.status === 'Submitted';
        const canReject = !isFreelancer && ms.status === 'Submitted';
        const previousApproved = idx === 0 || milestones.slice(0, idx).every(m => m.status === 'Approved');
        const canSubmitSequential = canSubmit && previousApproved;

        return (
          <div key={idx} style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            padding: '1rem',
            marginBottom: '0.75rem',
            background: ms.status === 'Approved' ? 'var(--bg-secondary)' : 'var(--bg-primary)',
            opacity: ms.status === 'Approved' ? 0.85 : 1
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span>{config.icon}</span>
                  <strong style={{ fontSize: '0.95rem' }}>{ms.title}</strong>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: config.bg,
                    color: config.color,
                    fontWeight: 600
                  }}>
                    {config.label}
                  </span>
                </div>
                {ms.description && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
                    {ms.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <span>💰 {ms.amount} {proposal.currency || 'HT'}</span>
                  {ms.dueDate && <span>📅 Due: {new Date(ms.dueDate).toLocaleDateString()}</span>}
                  {ms.submittedAt && <span>📤 Submitted: {new Date(ms.submittedAt).toLocaleDateString()}</span>}
                  {ms.approvedAt && <span>✅ Approved: {new Date(ms.approvedAt).toLocaleDateString()}</span>}
                </div>
                {ms.rejectionReason && ms.status === 'Rejected' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger-500)', marginTop: '0.25rem' }}>
                    Reason: {ms.rejectionReason}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {canSubmitSequential && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSubmit(idx)}
                    disabled={actionLoading === `submit-${idx}`}
                  >
                    {actionLoading === `submit-${idx}` ? 'Submitting...' : 'Submit'}
                  </button>
                )}
                {canSubmit && !canSubmitSequential && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                    Complete previous milestones first
                  </span>
                )}
                {canApprove && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApprove(idx)}
                    disabled={actionLoading === `approve-${idx}`}
                  >
                    {actionLoading === `approve-${idx}` ? 'Approving...' : '✓ Approve & Pay'}
                  </button>
                )}
                {canReject && !showRejectInput && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setShowRejectInput(idx); setRejectReason(''); }}
                    disabled={actionLoading === `reject-${idx}`}
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>

            {/* Reject Reason Input */}
            {showRejectInput === idx && (
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (optional)"
                  style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleReject(idx)}
                  disabled={actionLoading === `reject-${idx}`}
                >
                  Confirm Reject
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowRejectInput(null)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MilestoneTracker;