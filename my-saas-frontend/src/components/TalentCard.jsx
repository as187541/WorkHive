import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiStar } from 'react-icons/fi';
import RatingStars from './RatingStars';

const TalentCard = ({ talent }) => {
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
        </div>

        <div className="talent-info">
          <h3 className="talent-name">{talent.name}</h3>
          <p className="talent-role">{talent.role || 'Freelancer'}</p>
        </div>

        <span className={`availability-badge ${availabilityClass}`}>
          {getAvailabilityLabel(talent.availabilityStatus)}
        </span>
      </div>

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
