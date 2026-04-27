import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ProfilePage = () => {
  const [user, setUser] = useState({ name: '', email: '' });
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    // Fetch current user data on load
    api.get('/auth/me')
      .then(res => {
        setUser(res.data);
        setPreview(res.data.avatar); // Set initial preview if avatar exists
      })
      .catch(err => console.error(err));
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
    </div>
  );
};

export default ProfilePage;