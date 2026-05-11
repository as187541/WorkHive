import React from 'react';
import { useNavigate } from 'react-router-dom';
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
      </div>

      <div className="service-card-content">
        <div className="service-card-freelancer" onClick={handleFreelancerClick}>
          {freelancer.avatar ? (
            <img src={freelancer.avatar} alt={freelancer.name} className="freelancer-avatar-sm" />
          ) : (
            <div className="freelancer-avatar-placeholder-sm">
              {freelancer.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <span className="freelancer-name">{freelancer.name || 'Unknown'}</span>
        </div>

        <h3 className="service-card-title">{service.title}</h3>
        <p className="service-card-description">
          {service.description?.substring(0, 100)}{service.description?.length > 100 ? '...' : ''}
        </p>

        <div className="service-card-meta">
          <div className="service-card-rating">
            <RatingStars score={service.ratingAverage || 0} size="small" />
            <span className="rating-count">({service.totalReviews || 0})</span>
          </div>
          <div className="service-card-orders">
            {service.totalOrders || 0} orders
          </div>
        </div>

        <div className="service-card-footer">
          <div className="service-card-price">
            <span className="price-value">{service.price}</span>
            <span className="price-currency">{service.currency}</span>
          </div>
          {showOrderButton && (
            <button className="btn btn-primary btn-sm" onClick={handleOrderClick}>
              Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicePackageCard;
