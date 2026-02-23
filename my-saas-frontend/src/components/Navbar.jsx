// src/components/Navbar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher'; // Import the new component

const Navbar = ({ user, onCreateWorkspaceClick }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear user-specific data from localStorage on logout
    localStorage.removeItem('token');
    localStorage.removeItem('theme'); // Also clear theme preference
    navigate('/login');
  };

  return (
    <nav className="navbar">
      {/* Search bar can be a future feature */}
      <div>
        <input type="text" placeholder="Search across all workspaces..." className="search-bar" />
      </div>

      <div className="navbar-user-actions">
        {/* The primary action button */}
        <button onClick={onCreateWorkspaceClick} className="btn btn-primary">
          + New Workspace
        </button>
        
        {/* The new theme switcher component */}
        <ThemeSwitcher />
        
        {/* The new, icon-only logout button */}
        <button onClick={handleLogout} className="btn-logout" title="Logout">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round">
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