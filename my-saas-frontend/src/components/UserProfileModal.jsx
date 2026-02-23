import React, { useState, useEffect } from 'react';
import api from '../services/api';

const UserProfileModal = ({ isOpen, userId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      api.get(`/auth/user/${userId}`)
        .then(res => setProfile(res.data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
        
        
        {loading ? (
          <p>Loading profile...</p>
        ) : profile ? (
          <div className="profile-view">
            <div className="profile-header-large">
              <div className="profile-avatar-xl">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <h2>{profile.name}</h2>
              <span className="role-badge">{profile.role}</span>
            </div>

            <div className="profile-details-list">
              <div className="detail-item">
                <label>Email Address</label>
                <p>{profile.email}</p>
              </div>
              <div className="detail-item">
                <label>Member Since</label>
                <p>{new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <button className="btn btn-primary" style={{width: '100%', marginTop: '20px'}} onClick={onClose}>
              Close Profile
            </button>
          </div>
        ) : <p>User not found.</p>}
      </div>
    </div>
  );
};

export default UserProfileModal;