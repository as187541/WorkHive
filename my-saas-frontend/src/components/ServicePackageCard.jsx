import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHexagon } from 'react-icons/fi';
import RatingStars from './RatingStars';

const ServicePackageCard = ({ service, onOrderClick, showOrderButton = true }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/services/${service._id}`);
  };

  const handleOrderClick = (e) => {
    e.stopPropagation();
    if (onOrderClick) onOrderClick(service);
  };

  const handleFreelancerClick = (e) => {
    e.stopPropagation();
    navigate(`/talent/${service.freelancer?._id || service.freelancer}`);
  };

  const freelancer = service.freelancer || {};
  const levelBadge = service.level || (service.price > 500 ? 'Expert' : 'Pro');

  return (
    <div className="service-package-card" onClick={handleCardClick}>
      <div className="service-card-image">
        {service.images && service.images.length > 0 ? (
          <img src={service.images[0].url} alt={service.title} loading="lazy" />
        ) : (
          <div className="service-card-image-placeholder">
            <span>📦</span>
          </div>
        )}
        <span className={`service-level-badge ${levelBadge.toLowerCase()}`}>
          {levelBadge}
        </span>
      </div>

      <div className="service-card-content">
        <h3 className="service-card-title">{service.title}</h3>
        <p className="service-card-description">
          {service.description?.substring(0, 80)}{service.description?.length > 80 ? '...' : ''}
        </p>

        <div className="service-card-footer">
          <div className="service-card-price">
            <FiHexagon className="token-icon" size={16} style={{ color: 'var(--primary-500)' }} />
            <span className="price-value">{service.price}</span>
            <span className="price-currency">{service.currency || 'HT'}</span>
          </div>
          <span className="stock-count">{service.stock || 45} in stock</span>
        </div>

        {showOrderButton && (
          <button className="btn btn-primary redeem-btn" onClick={handleOrderClick}>
            Redeem
          </button>
        )}
      </div>
    </div>
  );
};

export default ServicePackageCard;
