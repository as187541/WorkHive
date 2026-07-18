// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const LoginPage = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [formData, setFormData] = useState({ name: '', email: '', password: '', otp: '', newPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (mode === 'forgot') {
      try {
        const { data } = await api.post('/auth/forgot-password', { email: formData.email });
        setSuccess(data.msg);
        setMode('reset');
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to send reset code.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'reset') {
      try {
        const { data } = await api.post('/auth/reset-password', {
          email: formData.email,
          otp: formData.otp,
          newPassword: formData.newPassword
        });
        setSuccess(data.msg);
        setTimeout(() => {
          setMode('login');
          setFormData({ ...formData, otp: '', newPassword: '' });
          setSuccess('');
        }, 2000);
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to reset password.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const payload = mode === 'login' 
      ? { email: formData.email, password: formData.password } 
      : formData;

    try {
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.msg || 'An error occurred.');
      setLoading(false);
    }
  };
  
  const handleGoogleCallback = async (response) => {
    setLoading(true);
    setError('');
    
    const idToken = response.credential;
    
    try {
      const { data } = await api.post('/auth/google', { idToken });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.msg || 'Google Sign-In failed.');
      setLoading(false);
    }
  };

  useEffect(() => {
    /* global google */
    if (window.google) {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback
      });

      google.accounts.id.renderButton(
        document.getElementById("signInDiv"),
        { theme: "outline", size: "large", width: "350px"}
      );
    }
  }, []);

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'register': return 'Create Your Account';
      case 'forgot': return 'Reset Password';
      case 'reset': return 'Enter Reset Code';
      default: return 'Welcome';
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>{getTitle()}</h2>
        <form onSubmit={handlePasswordSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>
          )}
          
          {(mode === 'login' || mode === 'register' || mode === 'forgot' || mode === 'reset') && (
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                disabled={mode === 'reset'}
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
                minLength={6}
              />
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div className="form-group">
                <label>Reset Code (6 digits)</label>
                <input 
                  type="text" 
                  name="otp" 
                  value={formData.otp} 
                  onChange={handleChange} 
                  required 
                  maxLength={6}
                  placeholder="Enter code from email"
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  name="newPassword" 
                  value={formData.newPassword} 
                  onChange={handleChange} 
                  required 
                  minLength={6}
                />
              </div>
            </>
          )}

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
          
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Processing...' : 
              mode === 'login' ? 'Log In' : 
              mode === 'register' ? 'Sign Up' : 
              mode === 'forgot' ? 'Send Reset Code' : 
              'Reset Password'}
          </button>
        </form>

        {mode === 'login' && (
          <>
            <div className="divider-or">OR</div>
            <div id="signInDiv"></div>
            
            <div className="auth-links">
              <button className="link-btn" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}>
                Forgot password?
              </button>
              <button className="link-btn" onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>
                Don't have an account? Sign Up
              </button>
            </div>
          </>
        )}

        {(mode === 'register' || mode === 'forgot') && (
          <button className="toggle-btn" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
            Back to Log In
          </button>
        )}

        {mode === 'reset' && (
          <button className="toggle-btn" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}>
            Resend Code
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginPage;