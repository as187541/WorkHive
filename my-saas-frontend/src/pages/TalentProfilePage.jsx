import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import RatingStars from '../components/RatingStars';
import PortfolioGallery from '../components/PortfolioGallery';
import HireModal from '../components/HireModal';
import ServicePackageCard from '../components/ServicePackageCard';
import OrderServiceModal from '../components/OrderServiceModal';
import './TalentProfilePage.css';
const TalentProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHireModal, setShowHireModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const [profileRes, servicesRes] = await Promise.all([
          api.get(`/talent/${userId}`),
          api.get(`/services/freelancer/${userId}`)
        ]);
        setProfile(profileRes.data.data);
        setServices(servicesRes.data.data || []);
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="talent-profile-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="talent-profile-page">
        <div className="error-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Profile not found</h3>
          <p>{error || 'The talent profile you are looking for does not exist.'}</p>
          <button onClick={() => navigate('/talent')} className="btn-back-action">
            ← Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="talent-profile-page page-enter">
      <div className="profile-header">
        <button onClick={() => navigate('/talent')} className="btn-back">
          ← Back to Marketplace
        </button>
      </div>

      <div className="profile-hero">
        <div className="talent-profile__avatar">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} />
          ) : (
            <div className="talent-profile__avatar-placeholder">{profile.name?.charAt(0)?.toUpperCase()}</div>
          )}
        </div>

        <div className="profile-info">
          <h1>{profile.name}</h1>
          <div className="profile-meta">
            <div className="rating-display">
              <RatingStars score={profile.ratingAverage || 0} />
              <span className="rating-text">
                {profile.ratingAverage?.toFixed(1) || '0.0'} ({profile.totalCompletedProjects || 0} projects)
              </span>
            </div>
            <span className={`availability-badge ${profile.availabilityStatus?.toLowerCase().replace(' ', '-')}`}>
              {profile.availabilityStatus || 'Open to work'}
            </span>
          </div>

          {profile.bio && <p className="profile-bio">{profile.bio}</p>}

          {profile.skills && profile.skills.length > 0 && (
            <div className="skills-list">
              {profile.skills.map((skill, idx) => (
                <span key={idx} className="skill-tag">{skill}</span>
              ))}
            </div>
          )}

          <div className="profile-actions">
            <button
              className="btn-hire"
              onClick={() => setShowHireModal(true)}
              disabled={profile.availabilityStatus === 'Not available'}
            >
              {profile.availabilityStatus === 'Not available' ? 'Not Available' : 'Hire for Project'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/messages?user=${profile._id}`)}
            >
              💬 Message
            </button>
          </div>
        </div>
      </div>

      {profile.portfolio && profile.portfolio.length > 0 && (
        <section className="profile-section">
          <h2>Portfolio</h2>
          <PortfolioGallery items={profile.portfolio} />
        </section>
      )}

      {profile.recentRatings && profile.recentRatings.length > 0 && (
        <section className="profile-section">
          <h2>Recent Ratings</h2>
          <div className="ratings-list">
            {profile.recentRatings.map(rating => (
              <div key={rating._id} className="rating-card">
                <div className="rating-header">
                  <div className="rater-info">
                    {rating.rater?.avatar && <img src={rating.rater.avatar} alt="" className="rater-avatar" />}
                    <span>{rating.rater?.name || 'Anonymous'}</span>
                  </div>
                  <RatingStars score={rating.score} />
                </div>
                {rating.review && <p className="rating-review">"{rating.review}"</p>}
                <span className="rating-project">Project: {rating.project?.name || 'N/A'}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section className="profile-section">
          <h2>Services</h2>
          <div className="services-grid">
            {services.map(service => (
              <ServicePackageCard
                key={service._id}
                service={service}
                onOrderClick={(svc) => {
                  setSelectedService(svc);
                  setShowOrderModal(true);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {showHireModal && (
        <HireModal
          talentId={profile._id}
          talentName={profile.name}
          onClose={() => setShowHireModal(false)}
        />
      )}

      {showOrderModal && selectedService && (
        <OrderServiceModal
          service={selectedService}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedService(null);
          }}
          onSuccess={() => {
            setShowOrderModal(false);
            setSelectedService(null);
          }}
        />
      )}
    </div>
  );
};

export default TalentProfilePage;
