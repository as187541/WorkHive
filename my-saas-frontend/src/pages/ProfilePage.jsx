import React, { useState, useEffect } from 'react';
import api from '../services/api';
import RatingStars from '../components/RatingStars';
import { SKILL_OPTIONS } from '../constants/skills';

const ProfilePage = () => {
  const [user, setUser] = useState({ name: '', email: '' });
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState('');
  
  // Talent profile state
  const [talentProfile, setTalentProfile] = useState({
    bio: '',
    skills: [],
    portfolio: [],
    availabilityStatus: 'Open to work',
    hourlyRate: ''
  });
  const [newSkill, setNewSkill] = useState('');
  const [newPortfolioItem, setNewPortfolioItem] = useState({ title: '', description: '', url: '' });
  const [talentStats, setTalentStats] = useState(null);
  const [activeTab, setActiveTab] = useState('account');

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        setUser(res.data);
        setPreview(res.data.avatar);
        // Pre-fill talent profile fields if they exist
        setTalentProfile({
          bio: res.data.bio || '',
          skills: res.data.skills || [],
          portfolio: res.data.portfolio || [],
          availabilityStatus: res.data.availabilityStatus || 'Open to work',
          hourlyRate: res.data.hourlyRate || ''
        });
      })
      .catch(err => console.error(err));
    
    // Fetch talent stats
    api.get('/auth/me/talent-stats')
      .then(res => setTalentStats(res.data.data))
      .catch(() => {});
  }, []);
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return setMessage({ text: 'File too large. Max 2MB.', type: 'error' });
      }
      setAvatarFile(file);
      setPreview(URL.createObjectURL(file)); // Show instant local preview
    }
  };

   const handleSendOTP = async () => {
    setLoading(true);
    try {
      await api.post('/auth/request-otp');
      setOtpSent(true);
      setMessage({ text: 'OTP sent to your email!', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Failed to send OTP.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- TALENT PROFILE HANDLERS ---
  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    if (talentProfile.skills.includes(trimmed)) return;
    if (!SKILL_OPTIONS.includes(trimmed)) return;
    setTalentProfile(prev => ({
      ...prev,
      skills: [...prev.skills, trimmed]
    }));
    setNewSkill('');
  };

  const handleRemoveSkill = (skill) => {
    setTalentProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleAddPortfolioItem = () => {
    if (!newPortfolioItem.title.trim()) return;
    setTalentProfile(prev => ({
      ...prev,
      portfolio: [...prev.portfolio, { ...newPortfolioItem }]
    }));
    setNewPortfolioItem({ title: '', description: '', url: '' });
  };

  const handleRemovePortfolioItem = (index) => {
    setTalentProfile(prev => ({
      ...prev,
      portfolio: prev.portfolio.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateTalentProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch('/auth/update-talent-profile', {
        bio: talentProfile.bio,
        skills: talentProfile.skills,
        portfolio: talentProfile.portfolio,
        availabilityStatus: talentProfile.availabilityStatus,
        hourlyRate: talentProfile.hourlyRate ? Number(talentProfile.hourlyRate) : null
      });
      setMessage({ text: res.data.msg, type: 'success' });
    } catch (err) {
      setMessage({ text: err.response?.data?.msg || 'Failed to update talent profile.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

    const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // --- CRITICAL CHANGE: Use FormData instead of a JSON object ---
      const formData = new FormData();
      formData.append('name', user.name);
      
      if (password) {
        formData.append('password', password);
        formData.append('otp', otp);
      }
      
       if (avatarFile) {
      
      formData.append('avatar', avatarFile); 
    }

      for (let key of formData.keys()) {
     
    }

    const res = await api.patch('/auth/update-profile', formData);

      setMessage({ text: res.data.message, type: 'success' });

      setPassword('');
      setOtp('');
      setOtpSent(false);
      setAvatarFile(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMessage({ text: err.response?.data?.msg || 'Update failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

   return (
    <div className="profile-container">
      <header className="page-header"><h1>Account Settings</h1></header>
      
      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          Account
        </button>
        <button
          className={`tab ${activeTab === 'talent' ? 'active' : ''}`}
          onClick={() => setActiveTab('talent')}
        >
          Talent Profile
        </button>
      </div>

      {activeTab === 'account' && (
      <div className="auth-form" style={{ maxWidth: '500px', margin: '0' }}>
        <form onSubmit={handleUpdate}>
          <div className="profile-upload-section" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="profile-avatar-xl" style={{ margin: '0 auto 15px auto' }}>
              {preview ? (
                <img src={preview} alt="Profile" className="profile-avatar-img" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              Change Photo
              <input type="file" accept="image/*" hidden onChange={handleFileChange} />
            </label>
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={user.name} onChange={(e) => setUser({...user, name: e.target.value})} />
          </div>

          <div className="form-group">
            <label>New Password (Optional)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" />
          </div>

          {password && !otpSent && (
            <button type="button" className="btn btn-secondary" onClick={handleSendOTP} disabled={loading}>
              Send OTP to Email to Confirm Password Change
            </button>
          )}

          {otpSent && (
            <div className="form-group">
              <label>Enter 6-Digit OTP</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Check your email" required />
            </div>
          )}

          {message.text && <p className={message.type === 'success' ? 'success-text' : 'error-message'}>{message.text}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Processing...' : 'Save Changes'}
          </button>
        </form>
      </div>
      )}

      {activeTab === 'talent' && (
        <div className="auth-form" style={{ maxWidth: '600px', margin: '0' }}>
          {talentStats && (
            <div className="talent-stats-bar">
              <div className="stat-item">
                <span className="stat-value">{talentStats.ratingAverage?.toFixed(1) || '0.0'}</span>
                <RatingStars score={talentStats.ratingAverage || 0} size="small" />
              </div>
              <div className="stat-item">
                <span className="stat-value">{talentStats.totalCompletedProjects || 0}</span>
                <span className="stat-label">Projects Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{talentStats.pendingHires || 0}</span>
                <span className="stat-label">Pending Invites</span>
              </div>
            </div>
          )}

          <form onSubmit={handleUpdateTalentProfile}>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={talentProfile.bio}
                onChange={(e) => setTalentProfile(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell others about yourself..."
                maxLength={500}
                rows={4}
              />
              <span className="char-count">{talentProfile.bio.length}/500</span>
            </div>

            <div className="form-group">
              <label>Availability</label>
              <select
                value={talentProfile.availabilityStatus}
                onChange={(e) => setTalentProfile(prev => ({ ...prev, availabilityStatus: e.target.value }))}
              >
                <option value="Open to work">Open to work</option>
                <option value="Busy">Busy</option>
                <option value="Not available">Not available</option>
              </select>
            </div>

            <div className="form-group">
              <label>Skills</label>
              <div className="skills-input-row">
                <input
                  list="skill-options"
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Search and select a skill..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                />
                <datalist id="skill-options">
                  {SKILL_OPTIONS.filter(s => !talentProfile.skills.includes(s)).map(skill => (
                    <option key={skill} value={skill} />
                  ))}
                </datalist>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddSkill}
                  disabled={!newSkill.trim() || !SKILL_OPTIONS.includes(newSkill.trim())}
                >
                  Add
                </button>
              </div>
              <div className="skills-tags">
                {talentProfile.skills.map((skill, idx) => (
                  <span key={idx} className="skill-tag">
                    {skill}
                    <button type="button" className="remove-skill" onClick={() => handleRemoveSkill(skill)}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Portfolio</label>
              <div className="portfolio-inputs">
                <input
                  type="text"
                  placeholder="Project title"
                  value={newPortfolioItem.title}
                  onChange={(e) => setNewPortfolioItem(prev => ({ ...prev, title: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newPortfolioItem.description}
                  onChange={(e) => setNewPortfolioItem(prev => ({ ...prev, description: e.target.value }))}
                />
                <input
                  type="url"
                  placeholder="Project URL"
                  value={newPortfolioItem.url}
                  onChange={(e) => setNewPortfolioItem(prev => ({ ...prev, url: e.target.value }))}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddPortfolioItem}>Add Project</button>
              </div>
              <div className="portfolio-list">
                {talentProfile.portfolio.map((item, idx) => (
                  <div key={idx} className="portfolio-item-compact">
                    <strong>{item.title}</strong>
                    {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer">Link</a>}
                    <button type="button" className="remove-portfolio" onClick={() => handleRemovePortfolioItem(idx)}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Hourly Rate (USD, optional)</label>
              <input
                type="number"
                value={talentProfile.hourlyRate}
                onChange={(e) => setTalentProfile(prev => ({ ...prev, hourlyRate: e.target.value }))}
                placeholder="e.g., 50"
                min="0"
              />
            </div>

            {message.text && activeTab === 'talent' && <p className={message.type === 'success' ? 'success-text' : 'error-message'}>{message.text}</p>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Talent Profile'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;