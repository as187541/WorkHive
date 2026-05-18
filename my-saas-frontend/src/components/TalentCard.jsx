import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiStar, FiClock } from 'react-icons/fi';
import RatingStars from './RatingStars';

const TalentCard = ({ talent, matchScore, lastActive, recommendationReason }) => {
  const navigate = useNavigate();

  const getAvailabilityLabel = (status) => {
    switch (status?.toLowerCase().replace(' ', '-')) {
      case 'open-to-work': return 'Open to Work';
      case 'busy': return 'Busy';
      case 'not-available': return 'Not Available';
      default: return 'Open to Work';
    }
  };

  const availabilityClass = talent.availabilityStatus?.toLowerCase().replace(' ', '-') || 'open-to-work';

  // Match score color coding
  const getMatchScoreClass = (score) => {
    if (score >= 70) return 'match-high';
    if (score >= 40) return 'match-medium';
    return 'match-low';
  };

  // Availability indicator dot color
  const getAvailabilityDotClass = (status) => {
    switch (status?.toLowerCase().replace(' ', '-')) {
      case 'open-to-work': return 'dot-available';
      case 'busy': return 'dot-busy';
      case 'not-available': return 'dot-unavailable';
      default: return 'dot-available';
    }
  };

  // Format lastActive as relative time
  const formatLastActive = (dateStr) => {
    if (!dateStr) return null;
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'Active now';
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    if (diffDays < 30) return `Active ${diffDays}d ago`;
    return 'Active 30d+ ago';
  };

  const lastActiveText = formatLastActive(lastActive || talent.lastActive);

  return (
    <div className="talent-card">
      <div className="talent-card-header">
        <div className="talent-avatar-wrapper">
          {talent.avatar ? (
            <img src={talent.avatar} alt={talent.name} className="talent-avatar" />
          ) : (
            <div className="talent-avatar-placeholder">
              {talent.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <span className={`availability-indicator ${getAvailabilityDotClass(talent.availabilityStatus)}`}></span>
        </div>

        <div className="talent-info">
          <h3 className="talent-name">{talent.name}</h3>
          <p className="talent-role">{talent.role || 'Freelancer'}</p>
          {lastActiveText && (
            <span className="last-active-time">
              <FiClock size={11} /> {lastActiveText}
            </span>
          )}
        </div>

        <div className="talent-header-badges">
          {matchScore != null && (
            <span className={`match-score-badge ${getMatchScoreClass(matchScore)}`}>
              {matchScore}% Match
            </span>
          )}
          <span className={`availability-badge ${availabilityClass}`}>
            {getAvailabilityLabel(talent.availabilityStatus)}
          </span>
        </div>
      </div>

      {recommendationReason && (
        <div className="recommendation-reason">
          💡 {recommendationReason}
        </div>
      )}

      <div className="talent-card-body">
        {talent.bio && (
          <p className="talent-bio">
            {talent.bio.substring(0, 120)}{talent.bio.length > 120 && '...'}
          </p>
        )}

        {talent.skills && talent.skills.length > 0 && (
          <div className="talent-skills">
            {talent.skills.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="skill-tag">{skill}</span>
            ))}
            {talent.skills.length > 3 && (
              <span className="skill-tag more">+{talent.skills.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="talent-card-footer">
        <div className="talent-rating">
          <FiStar size={14} className="star-icon" />
          <span className="rating-score">{talent.ratingAverage?.toFixed(1) || '0.0'}</span>
          <span className="rating-count">({talent.totalReviews || 0})</span>
        </div>
        <div className="talent-rate">
          ${talent.hourlyRate || 85}/hr
        </div>
      </div>

      <button
        className="btn btn-primary hire-btn"
        onClick={() => navigate(`/talent/${talent._id}`)}
      >
        Hire
      </button>
    </div>
  );
};

export default TalentCard;
