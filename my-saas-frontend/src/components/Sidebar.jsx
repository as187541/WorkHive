// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  FiLayout, FiFolder, FiUsers, FiPackage, FiBriefcase,
  FiMessageSquare, FiClipboard, FiShoppingBag,
  FiShield, FiCheckSquare, FiActivity, FiUserPlus, FiEdit3, FiSend, FiBarChart2, FiZap
} from 'react-icons/fi';
import api from '../services/api';

const Sidebar = ({ user, workspaces, collaborators, onInviteClick, onUserClick, mobileOpen = false, onClose }) => {
  const { workspaceId } = useParams();
  const [pendingRedemptions, setPendingRedemptions] = useState(0);

  const currentUserRecord = collaborators.find(c => c.user?._id === user?._id);
  const isAdmin = currentUserRecord?.role === 'Admin';

  const isApprover = user?.role === 'SuperAdmin' ||
    user?.approverScope?.adminWorkspaces?.length > 0 ||
    user?.approverScope?.leadProjects?.length > 0;

  // Fetch pending redemption count for approvers
  useEffect(() => {
    if (!isApprover) return;
    const fetchPending = async () => {
      try {
        const res = await api.get('/redemptions/pending-count');
        setPendingRedemptions(res.data.count || 0);
      } catch {
        // Silently fail
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [isApprover]);

  const handleRemoveMember = async (userId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      try {
        await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
        window.location.reload();
      } catch (err) {
        alert(err.response?.data?.msg || "Failed to remove member.");
      }
    }
  };

  const navItems = [
    { to: '/', icon: FiLayout, label: 'Dashboard', end: true },
    { to: '/workspaces', icon: FiFolder, label: 'Workspaces' },
    { to: '/my-tasks', icon: FiCheckSquare, label: 'My Tasks' },
    { to: '/activity-log', icon: FiActivity, label: 'Activity Log' },
    { to: '/talent', icon: FiUsers, label: 'Talent Marketplace' },
    { to: '/services', icon: FiPackage, label: 'Services' },
    { to: '/jobs', icon: FiClipboard, label: 'Jobs' },
    { to: '/my-jobs', icon: FiEdit3, label: 'My Job Postings' },
    { to: '/my-proposals', icon: FiSend, label: 'My Proposals' },
    { to: '/messages', icon: FiMessageSquare, label: 'Messages' },
    { to: '/connections', icon: FiUserPlus, label: 'Connections' },
    { to: '/hire-invitations', icon: FiBriefcase, label: 'Hire Invitations' },
    { to: '/orders', icon: FiShoppingBag, label: 'Orders' },
    { to: '/analytics', icon: FiBarChart2, label: 'Analytics' },
    { to: '/automations', icon: FiZap, label: 'Automations' },
    { to: '/rewards', icon: FiShoppingBag, label: 'Reward Store' },
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && <div className="sidebar-overlay visible" onClick={onClose} />}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">W</div>
        <span>WorkHive</span>
      </div>

      <nav className="sidebar-nav">
        {/* Main Navigation */}
        <div className="nav-section">
          <ul>
            {navItems.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={() => mobileOpen && onClose?.()}
                >
                  <item.icon style={{ marginRight: '10px', fontSize: '1.1rem' }} />
                  {item.label}
                  {item.to === '/rewards' && isApprover && pendingRedemptions > 0 && (
                    <span className="sidebar-badge">{pendingRedemptions > 9 ? '9+' : pendingRedemptions}</span>
                  )}
                </NavLink>
              </li>
            ))}
            {user?.role === 'SuperAdmin' && (
              <li>
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
                  <FiShield style={{ marginRight: '10px', fontSize: '1.1rem' }} />
                  Admin Panel
                </NavLink>
              </li>
            )}
          </ul>
        </div>

        {/* Workspaces Section */}
        <div className="nav-section">
          <h3 className="nav-title">My Workspaces</h3>
          <ul>
            {workspaces.map(ws => (
              <li key={ws._id}>
                <NavLink
                  to={`/workspaces/${ws._id}`}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  <span
                    className="workspace-dot"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      backgroundColor: ws.color || '#f59e0b',
                      marginRight: 10,
                      flexShrink: 0
                    }}
                  />
                  {ws.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Collaborators Section */}
        {workspaceId && (
          <div className="nav-section">
            <div className="nav-title-action">
              <h3 className="nav-title">Collaborators</h3>
              {isAdmin && (
                <button onClick={onInviteClick} className="invite-btn" title="Invite member">
                  +
                </button>
              )}
            </div>
            <ul>
              {collaborators.map((c) => (
                <li key={c.user?._id} className="collaborator-item">
                  <div
                    className="collaborator-info clickable-user"
                    onClick={() => c.user && onUserClick(c.user._id)}
                  >
                    <div className="profile-avatar" style={{ width: '28px', height: '28px', fontSize: '0.65rem' }}>
                      {c.user?.avatar ? (
                        <img src={c.user.avatar} alt="" className="profile-avatar-img" />
                      ) : (
                        c.user?.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem' }}>{c.user?.name} {c.user?._id === user?._id ? '(You)' : ''}</span>
                  </div>
                  <div className="collaborator-actions">
                    <span className="mini-role-tag">{c.role}</span>
                    {isAdmin && c.user?._id !== user?._id && (
                      <button
                        className="btn-remove-member"
                        onClick={() => handleRemoveMember(c.user._id)}
                        title="Remove member"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="sidebar-profile">
        <NavLink to="/profile" className="profile-link">
          <div className="profile-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="profile-avatar-img" />
            ) : (
              user?.name ? user.name.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="profile-name">{user?.name}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{user?.email}</span>
          </div>
        </NavLink>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;