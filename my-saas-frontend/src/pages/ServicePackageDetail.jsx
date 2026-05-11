import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import RatingStars from '../components/RatingStars';
import OrderServiceModal from '../components/OrderServiceModal';

const ServicePackageDetail = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/services/${serviceId}`);
        setService(res.data.data);
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to load service details');
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [serviceId]);

  if (loading) {
    return (
      <div className="service-detail-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading service details...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="service-detail-page">
        <div className="error-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Service not found</h3>
          <p>{error || 'The service package you are looking for does not exist.'}</p>
          <button onClick={() => navigate('/services')} className="btn btn-primary">
            ← Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const freelancer = service.freelancer || {};

  return (
    <div className="service-detail-page page-enter">
      <div className="service-detail-header">
        <button onClick={() => navigate('/services')} className="btn btn-back">
          ← Back to Marketplace
        </button>
      </div>

      <div className="service-detail-layout">
        <div className="service-detail-main">
          <h1>{service.title}</h1>

          <div className="service-detail-freelancer">
            {freelancer.avatar ? (
              <img src={freelancer.avatar} alt={freelancer.name} className="freelancer-avatar" />
            ) : (
              <div className="freelancer-avatar-placeholder">
                {freelancer.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div className="freelancer-info">
              <span className="freelancer-name">{freelancer.name || 'Unknown'}</span>
              <div className="freelancer-meta">
                <RatingStars score={freelancer.ratingAverage || 0} size="small" />
                <span>{freelancer.totalCompletedProjects || 0} projects completed</span>
                <span className={`availability-badge ${freelancer.availabilityStatus?.replace(/\s+/g, '-').toLowerCase()}`}>
                  {freelancer.availabilityStatus || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <div className="service-detail-images">
            {service.images && service.images.length > 0 ? (
              service.images.map((img, index) => (
                <img key={index} src={img.url} alt={`${service.title} ${index + 1}`} />
              ))
            ) : (
              <div className="service-image-placeholder">📦</div>
            )}
          </div>

          <div className="service-detail-section">
            <h3>About This Service</h3>
            <p>{service.description}</p>
          </div>

          {service.features && service.features.length > 0 && (
            <div className="service-detail-section">
              <h3>What's Included</h3>
              <ul className="feature-list">
                {service.features.map((feature, index) => (
                  <li key={index}>✓ {feature}</li>
                ))}
              </ul>
            </div>
          )}

          {service.skills && service.skills.length > 0 && (
            <div className="service-detail-section">
              <h3>Skills</h3>
              <div className="skill-tags">
                {service.skills.map(skill => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="service-detail-sidebar">
          <div className="service-order-card">
            <div className="service-price">
              <span className="price-value">{service.price}</span>
              <span className="price-currency">{service.currency}</span>
            </div>

            <div className="service-meta-list">
              <div className="meta-item">
                <span className="meta-label">⏱️ Delivery</span>
                <span className="meta-value">{service.deliveryDays} days</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">🔄 Revisions</span>
                <span className="meta-value">{service.revisions}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">⭐ Rating</span>
                <span className="meta-value">
                  <RatingStars score={service.ratingAverage || 0} size="small" />
                  ({service.totalReviews || 0})
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">📦 Orders</span>
                <span className="meta-value">{service.totalOrders || 0}</span>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={() => setIsOrderModalOpen(true)}
              disabled={freelancer.availabilityStatus === 'Not available'}
            >
              {freelancer.availabilityStatus === 'Not available'
                ? 'Not Available'
                : 'Order Now'}
            </button>
          </div>
        </div>
      </div>

      {isOrderModalOpen && (
        <OrderServiceModal
          service={service}
          onClose={() => setIsOrderModalOpen(false)}
          onSuccess={() => {
            setIsOrderModalOpen(false);
            alert('Order placed successfully!');
          }}
        />
      )}
    </div>
  );
};

export default ServicePackageDetail;
