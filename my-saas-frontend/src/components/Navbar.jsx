// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiShield, FiBell } from 'react-icons/fi';
import ThemeSwitcher from './ThemeSwitcher';
import api from '../services/api';

const Navbar = ({ user, onCreateWorkspaceClick }) => {
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending redemption count for approvers
  useEffect(() => {
    const hasApproverScope = user?.approverScope?.isSuperAdmin || 
                             user?.approverScope?.adminWorkspaces?.length > 0 || 
                             user?.approverScope?.leadProjects?.length > 0;
    if (!hasApproverScope) return;

    const fetchPending = async () => {
      try {
        const res = await api.get('/redemptions/pending-count');
        setPendingCount(res.data.count);
      } catch {
        // Silently fail — not critical
      }
    };

    fetchPending();
    
    // Poll every 30 seconds for new requests
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [user?.approverScope]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('theme');
    window.location.href = '/login';
  };

  return (
    <nav className="navbar">
      {/* Left: Branding/Home Link */}
      <div className="navbar-left">
        <Link to="/" className="nav-home-link">Dashboard</Link>
        {user?.role === 'SuperAdmin' && (
          <Link to="/admin" className="nav-admin-link">
            <FiShield style={{ marginRight: '6px' }} /> Admin
          </Link>
        )}
        {(user?.approverScope?.isSuperAdmin || user?.approverScope?.adminWorkspaces?.length > 0 || user?.approverScope?.leadProjects?.length > 0) && (
          <Link to="/review-redemptions" className="nav-admin-link" style={{ position: 'relative' }}>
            <FiBell style={{ marginRight: '6px' }} /> 
            Requests
            {pendingCount > 0 && (
              <span className="notification-badge">{pendingCount}</span>
            )}
          </Link>
        )}
      </div>

      {/* Right: Actions & Profile */}
      <div className="navbar-user-actions">
        {/* Create Workspace Trigger */}
        <button 
          onClick={onCreateWorkspaceClick} 
          className="btn btn-primary btn-sm"
        >
          + New Workspace
        </button>
        
        {/* Theme Toggler */}
        <ThemeSwitcher />
        
        {/* Logout Icon Button */}
        <button onClick={handleLogout} className="btn-logout" title="Logout">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;