import React from 'react';
import { useNavigate } from 'react-router-dom';
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

  return (
    <div className="talent-card" onClick={() => navigate(`/talent/${talent._id}`)}>
      <div className="talent-card-header">
        {talent.avatar ? (
          <img src={talent.avatar} alt={talent.name} className="talent-avatar" />
        ) : (
          <div className="talent-avatar-placeholder">{talent.name?.charAt(0)?.toUpperCase()}</div>
        )}
        <div className="talent-card-meta">
          <h3 className="talent-name">{talent.name}</h3>
          <span className={`availability-badge ${talent.availabilityStatus?.toLowerCase().replace(' ', '-')}`}>
            {getAvailabilityLabel(talent.availabilityStatus)}
          </span>
        </div>
      </div>

      <div className="talent-card-body">
        {talent.bio && (
          <p className="talent-bio">
            {talent.bio.substring(0, 120)}{talent.bio.length > 120 && '...'}
          </p>
        )}
        
        {talent.skills && talent.skills.length > 0 && (
          <div className="talent-skills">
            {talent.skills.slice(0, 4).map((skill, idx) => (
              <span key={idx} className="skill-tag">{skill}</span>
            ))}
            {talent.skills.length > 4 && (
              <span className="skill-tag more">+{talent.skills.length - 4}</span>
            )}
          </div>
        )}
      </div>

      <div className="talent-card-footer">
        <div className="talent-rating">
          <RatingStars score={talent.ratingAverage || 0} size="small" />
          <span>{talent.ratingAverage?.toFixed(1) || '0.0'}</span>
        </div>
        <div className="talent-projects">
          <span>{talent.totalCompletedProjects || 0} projects</span>
        </div>
      </div>
    </div>
  );
};

export default TalentCard;
