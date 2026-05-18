import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiLayout, FiCheckSquare, FiMessageSquare, FiUsers, FiMoreHorizontal,
  FiFolder, FiPackage, FiClipboard, FiBriefcase, FiActivity,
  FiUserPlus, FiEdit3, FiSend, FiShoppingBag, FiBarChart2, FiZap,
  FiShield, FiAward
} from 'react-icons/fi';

const MobileNav = ({ user }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const primaryItems = [
    { to: '/', icon: FiLayout, label: 'Home', end: true },
    { to: '/my-tasks', icon: FiCheckSquare, label: 'Tasks' },
    { to: '/messages', icon: FiMessageSquare, label: 'Chat' },
    { to: '/talent', icon: FiUsers, label: 'Talent' },
  ];

  const moreItems = [
    { to: '/workspaces', icon: FiFolder, label: 'Workspaces' },
    { to: '/activity-log', icon: FiActivity, label: 'Activity' },
    { to: '/services', icon: FiPackage, label: 'Services' },
    { to: '/jobs', icon: FiClipboard, label: 'Jobs' },
    { to: '/my-jobs', icon: FiEdit3, label: 'My Jobs' },
    { to: '/my-proposals', icon: FiSend, label: 'Proposals' },
    { to: '/connections', icon: FiUserPlus, label: 'Connections' },
    { to: '/hire-invitations', icon: FiBriefcase, label: 'Hires' },
    { to: '/orders', icon: FiShoppingBag, label: 'Orders' },
    { to: '/analytics', icon: FiBarChart2, label: 'Analytics' },
    { to: '/automations', icon: FiZap, label: 'Automations' },
    { to: '/rewards', icon: FiAward, label: 'Rewards' },
    ...(user?.role === 'SuperAdmin' ? [{ to: '/admin', icon: FiShield, label: 'Admin' }] : []),
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="mobile-nav">
      {primaryItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={`mobile-nav-item ${isActive(item.to) ? 'active' : ''}`}
        >
          <item.icon />
          <span>{item.label}</span>
        </NavLink>
      ))}

      <div className="mobile-nav-more">
        <button
          className={`mobile-nav-item ${moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(!moreOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <FiMoreHorizontal />
          <span>More</span>
        </button>

        {moreOpen && (
          <div className="mobile-nav-more-sheet open">
            {moreItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={isActive(item.to) ? 'active' : ''}
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* Close more sheet when clicking outside */}
      {moreOpen && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 940 }}
          onClick={() => setMoreOpen(false)}
        />
      )}
    </nav>
  );
};

export default MobileNav;