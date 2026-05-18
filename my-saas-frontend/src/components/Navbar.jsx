// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiLogOut, FiUser, FiMenu } from 'react-icons/fi';
import ThemeSwitcher from './ThemeSwitcher';
import NotificationDropdown from './NotificationDropdown';
import MessageBadge from './MessageBadge';
import ConnectionBadge from './ConnectionBadge';

const Navbar = ({ user, onMenuToggle }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('theme');
    window.location.href = '/login';
  };

  return (
    <nav className="navbar">
      {/* Left: Hamburger + Brand */}
      <div className="navbar-left">
        {onMenuToggle && (
          <button className="hamburger-btn" onClick={onMenuToggle} aria-label="Open menu">
            <FiMenu size={20} />
          </button>
        )}
        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-icon">W</div>
          <span>WorkHive</span>
        </Link>
      </div>

      {/* Right: Actions & Profile */}
      <div className="navbar-user-actions">
        {/* Token Balance */}
        <div className="token-balance-pill">
          <div className="token-icon">
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #f97316)'
              }}
            />
          </div>
          <span>{user?.wallet?.balance || 0} HT</span>
        </div>

        <ConnectionBadge />
        <MessageBadge />
        <NotificationDropdown user={user} />

        <ThemeSwitcher />

        {/* User Avatar Dropdown */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            className="user-avatar-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              user?.name?.charAt(0).toUpperCase() || 'U'
            )}
          </button>

          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: 180,
                zIndex: 1000,
                padding: '8px 0'
              }}
            >
              <Link
                to="/profile"
                onClick={() => setShowUserMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  textDecoration: 'none'
                }}
              >
                <FiUser size={16} />
                Profile
              </Link>
              <div style={{ borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--danger-500)',
                  fontSize: '0.875rem'
                }}
              >
                <FiLogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;