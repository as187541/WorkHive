import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBookmark, FiHexagon } from 'react-icons/fi';

const JobPostingCard = ({ job, showActions = false, onEdit, onClose, onDelete }) => {
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState(false);

  const handleCardClick = () => {
    navigate(`/jobs/${job._id}`);
  };

  const formatBudget = () => {
    if (!job.budget) return 'Budget not specified';
    const { min, max, currency } = job.budget;
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ${currency || 'HT'}`;
    if (max) return `Up to ${max.toLocaleString()} ${currency || 'HT'}`;
    if (min) return `From ${min.toLocaleString()} ${currency || 'HT'}`;
    return 'Budget not specified';
  };

  const formatDuration = () => {
    if (!job.duration) return null;
    return job.duration;
  };

  const postedBy = job.postedBy || {};
  const postedTime = new Date(job.createdAt).toLocaleDateString();

  return (
    <div className="job-posting-card" onClick={handleCardClick}>
      <div className="job-card-header">
        <button
          className={`bookmark-btn ${bookmarked ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setBookmarked(!bookmarked);
          }}
        >
          <FiBookmark size={18} />
        </button>
      </div>

      <h3 className="job-card-title">{job.title}</h3>
      <p className="job-card-description">
        {job.description?.substring(0, 200)}{job.description?.length > 200 ? '...' : ''}
      </p>

      {job.skills && job.skills.length > 0 && (
        <div className="job-card-skills">
          {job.skills.slice(0, 4).map(skill => (
            <span key={skill} className="skill-tag">{skill}</span>
          ))}
          {job.skills.length > 4 && (
            <span className="skill-tag more">+{job.skills.length - 4}</span>
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
          <div className="job-poster-info">
            <span className="poster-name">{postedBy.name || 'Unknown'}</span>
            <span className="poster-company">{postedBy.company || 'Company'}</span>
          </div>
        </div>

        <div className="job-meta">
          <div className="job-meta-item">
            <FiHexagon size={14} style={{ color: 'var(--primary-500)' }} />
            <span>{formatBudget()}</span>
          </div>
          {formatDuration() && (
            <div className="job-meta-item">
              <span>⏱️ {formatDuration()}</span>
            </div>
          )}
          <div className="job-meta-item">
            <span>📋 {job.proposalsCount || 0} proposals</span>
          </div>
        </div>

        <div className="job-card-badges">
          {job.approvalStatus && job.approvalStatus !== 'Approved' && (
            <span className={`approval-badge approval-${job.approvalStatus.toLowerCase()}`}>
              {job.approvalStatus === 'Pending' ? '⏳ Pending Approval' : '❌ Rejected'}
            </span>
          )}
          <span className="level-badge">Expert</span>
          <span className="posted-time">{postedTime}</span>
        </div>
      </div>
    </div>
  );
};

export default JobPostingCard;
