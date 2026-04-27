// src/components/Navbar.jsx
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';

const Navbar = ({ user, onCreateWorkspaceClick }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('theme');
    // Use window.location to fully reset the app state on logout
    window.location.href = '/login';
  };

  return (
    <nav className="navbar">
      {/* Left: Branding/Home Link */}
      <div className="navbar-left">
        <Link to="/" className="nav-home-link">Dashboard</Link>
        
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