import React from 'react';
import { useNavigate } from 'react-router-dom';

const JobPostingCard = ({ job, showActions = false, onEdit, onClose, onDelete }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/jobs/${job._id}`);
  };

  const formatBudget = () => {
    if (!job.budget) return 'Budget not specified';
    const { min, max, currency } = job.budget;
    if (min && max) return `${min} - ${max} ${currency || 'HT'}`;
    if (max) return `Up to ${max} ${currency || 'HT'}`;
    if (min) return `From ${min} ${currency || 'HT'}`;
    return 'Budget not specified';
  };

  const formatDeadline = () => {
    if (!job.deadline) return null;
    const date = new Date(job.deadline);
    const now = new Date();
    const diff = date - now;
    if (diff < 0) return 'Deadline passed';
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} days left`;
  };

  const postedBy = job.postedBy || {};

  return (
    <div className="job-posting-card" onClick={handleCardClick}>
      <div className="job-card-header">
        <div className="job-card-meta">
          <span className={`job-status-badge status-${job.status?.toLowerCase()}`}>
            {job.status}
          </span>
          {job.visibility === 'Workspace' && (
            <span className="job-visibility-badge">🔒 Workspace</span>
          )}
        </div>
        <span className="job-posted-time">
          {new Date(job.createdAt).toLocaleDateString()}
        </span>
      </div>

      <h3 className="job-card-title">{job.title}</h3>
      <p className="job-card-description">
        {job.description?.substring(0, 120)}{job.description?.length > 120 ? '...' : ''}
      </p>

      <div className="job-card-details">
        <div className="job-detail-item">
          <span className="detail-label">💰 Budget</span>
          <span className="detail-value">{formatBudget()}</span>
        </div>
        {job.deadline && (
          <div className="job-detail-item">
            <span className="detail-label">⏱️ Deadline</span>
            <span className="detail-value">{formatDeadline()}</span>
          </div>
        )}
        <div className="job-detail-item">
          <span className="detail-label">📋 Proposals</span>
          <span className="detail-value">{job.proposalsCount || 0}</span>
        </div>
      </div>

      {job.skills && job.skills.length > 0 && (
        <div className="job-card-skills">
          {job.skills.slice(0, 4).map(skill => (
            <span key={skill} className="skill-tag-sm">{skill}</span>
          ))}
          {job.skills.length > 4 && (
            <span className="skill-tag-sm">+{job.skills.length - 4}</span>
          )}
        </div>
      )}

      <div className="job-card-footer">
        <div className="job-poster">
          {postedBy.avatar ? (
            <img src={postedBy.avatar} alt={postedBy.name} className="poster-avatar-sm" />
          ) : (
            <div className="poster-avatar-placeholder-sm">
              {postedBy.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <span className="poster-name">{postedBy.name || 'Unknown'}</span>
        </div>

        {showActions && (
          <div className="job-card-actions" onClick={e => e.stopPropagation()}>
            {job.status === 'Open' && (
              <>
                <button className="btn btn-sm btn-secondary" onClick={() => onEdit?.(job)}>Edit</button>
                <button className="btn btn-sm btn-warning" onClick={() => onClose?.(job._id)}>Close</button>
              </>
            )}
            <button className="btn btn-sm btn-danger" onClick={() => onDelete?.(job._id)}>Delete</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobPostingCard;
