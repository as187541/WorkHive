import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ProfilePage = () => {
  const [user, setUser] = useState({ name: '', email: '' });
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch current user data on load
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(err => console.error(err));
  }, []);

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
      const payload = { name: user.name };
      if (password) {
        payload.password = password;
        payload.otp = otp;
      }
      const res = await api.patch('/auth/update-profile', payload);
      setMessage({ text: res.data.message, type: 'success' });
      setPassword('');
      setOtp('');
      setOtpSent(false);
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