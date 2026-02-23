// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const payload = isLogin ? { email: formData.email, password: formData.password } : formData;

    try {
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      window.location.href = '/'; // Force a full page reload to re-check auth
    } catch (err) {
      setError(err.response?.data?.msg || 'An error occurred.');
      setLoading(false);
    }
  };
  
  const handleGoogleCallback = async (response) => {
    setLoading(true);
    setError('');
    
    // The credential is the ID token from Google
    const idToken = response.credential;
    
    try {
      // Send this ID token to our backend
      const { data } = await api.post('/auth/google', { idToken });
      localStorage.setItem('token', data.token);
      window.location.href = '/'; // Force reload to dashboard
    } catch (err) {
      setError(err.response?.data?.msg || 'Google Sign-In failed.');
      setLoading(false);
    }
  };

  useEffect(() => {
    // This is the global google object from the script we added to index.html
    /* global google */
    if (window.google) {
      google.accounts.id.initialize({
        client_id: "612541306739-1q9bke4skpq9t2821hdhr59do6cdmsiu.apps.googleusercontent.com",
        callback: handleGoogleCallback
      });

      google.accounts.id.renderButton(
        document.getElementById("signInDiv"),
        { theme: "outline", size: "large", width: "350px"}
      );
    }
  }, []);

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>{isLogin ? 'Welcome Back' : 'Create Your Account'}</h2>
        <form onSubmit={handlePasswordSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>
          )}
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div className="divider-or">OR</div>
        
        <div id="signInDiv"></div>

        <button className="toggle-btn" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Don’t have an account? Sign Up' : 'Already have an account? Log In'}
        </button>
      </div>
    </div>
  );
};
export default LoginPage;