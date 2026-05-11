// src/components/Sidebar.jsx
import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { FiAward, FiPlus, FiUsers, FiLayout, FiShoppingBag, FiShield, FiClock, FiInbox, FiBriefcase, FiPackage, FiMessageSquare, FiClipboard, FiFileText } from 'react-icons/fi';
import api from '../services/api';

const Sidebar = ({ user, workspaces, collaborators, onInviteClick, onUserClick }) => {
  const { workspaceId } = useParams();

  // Logic: Check if the logged-in user is an Admin in this specific workspace
  const currentUserRecord = collaborators.find(c => c.user?._id === user?._id);
  const isAdmin = currentUserRecord?.role === 'Admin';

  const handleRemoveMember = async (userId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      try {
        await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
        // Refresh the page to update the member list
        window.location.reload();
      } catch (err) {
        alert(err.response?.data?.msg || "Failed to remove member.");
      }
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">🚀 WorkHive</div>

       {/* NEW: Wallet/Token Section */}
      <div className="sidebar-wallet-card">
  <div className="token-icon-container">
    <FiAward />
  </div>
  <div className="wallet-details">
    <span className="wallet-label">Hive Wallet</span>
    <div className="flex items-baseline gap-1">
      <span className={`wallet-balance ${user?.wallet?.balance > 0 ? 'balance-animate' : ''}`}>
        {user?.wallet?.balance || 0}
      </span>
      <span style={{ fontSize: '0.6rem', color: 'var(--token-gold)' }}>HT</span>
    </div>
  </div>
</div>
      
      <nav className="sidebar-nav">
         {/* --- NEW: MAIN MENU SECTION --- */}
        <div className="nav-section">
          <h3 className="nav-title">General</h3>
          <ul>
            <li>
              <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                <FiLayout style={{marginRight: '10px'}} /> Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/talent" className={({ isActive }) => isActive ? 'active' : ''}>
                <FiUsers style={{marginRight: '10px'}} /> Talent Marketplace
              </NavLink>
            </li>
            <li>
              <NavLink to="/services" className={({ isActive }) => isActive ? 'active' : ''}>
                <FiPackage style={{marginRight: '10px'}} /> Service Marketplace
              </NavLink>
            </li>
            <li>
              <NavLink to="/my-services" className={({ isActive }) => isActive ? 'active' : ''}>
                <FiBriefcase style={{marginRight: '10px'}} /> My Services
              </NavLink>
            </li>
            <li>
              <NavLink to="/messages" className={({ isActive }) => isActive ? 'active' : ''}>
                <FiMessageSquare style={{marginRight: '10px'}} /> Messages
              </NavLink>
            </li>
            <li>
              <NavLink to="/jobs" className={({ isActive }) => isActive ? 'active' : ''}>
                <FiClipboard style={{marginRight: '10px'}} /> Job Board
              </NavLink>
            </li>
            <li>
              <NavLink to="/my-jobs" className={({ isActive }) => isActive ? 'active' : ''}>
                <FiFileText style={{marginRight: '10px'}} /> My Job Postings
              </NavLink>
            </li>
            <li>
              <NavLink to="/my-proposals" className={({ isActive }) => isActive ? 'active' : ''}>
                <FiFileText style={{marginRight: '10px'}} /> My Proposals
              </NavLink>
            </li>
            <li>
              <NavLink to="/hire-invitations" className={({ isActive }) => isActive ? 'active' : ''}>
                <FiBriefcase style={{marginRight: '10px'}} /> My Hire Requests
              </NavLink>
            </li>
            <li>
              <NavLink to="/rewards" className={({ isActive }) => isActive ? 'active' : ''}>
                <FiShoppingBag style={{marginRight: '10px'}} /> Reward Store
              </NavLink>
            </li>
            <li>
              <NavLink to="/my-redemptions" className={({ isActive }) => isActive ? 'active' : ''}>
                <FiClock style={{marginRight: '10px'}} /> My Requests
              </NavLink>
            </li>
            {(user?.approverScope?.adminWorkspaces?.length > 0 || user?.approverScope?.leadProjects?.length > 0) && (
              <li>
                <NavLink to="/review-redemptions" className={({ isActive }) => isActive ? 'active' : ''}>
                  <FiInbox style={{marginRight: '10px'}} /> Review Requests
                </NavLink>
              </li>
            )}
            {user?.role === 'SuperAdmin' && (
              <li>
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
                  <FiShield style={{marginRight: '10px'}} /> Admin Panel
                </NavLink>
              </li>
            )}
          </ul>
        </div>
        {/* --- WORKSPACES SECTION --- */}
        <div className="nav-section">
          <h3 className="nav-title">Workspaces</h3>
          <ul>
            {workspaces.map(ws => (
              <li key={ws._id}>
                <NavLink to={`/workspaces/${ws._id}`} className={({ isActive }) => isActive ? 'active' : ''}>
                  🗂️ {ws.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
        
        {/* --- MEMBERS SECTION (Dynamic) --- */}
        {workspaceId && (
          <div className="nav-section">
            <div className="nav-title-action">
              <h3 className="nav-title">Collaborators</h3>
              {/* Only show the [+] button if user is Admin */}
              {isAdmin && (
                <button 
                  onClick={onInviteClick} 
                  className="invite-btn" 
                  title="Invite new member"
                >
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
                    <div className="profile-avatar" style={{ width: '44px', height: '44px', fontSize: '0.7rem' }}>
                    {c.user?.avatar ? (
                      <img src={c.user.avatar} alt="" className="profile-avatar-img" />
                    ) : (
                      c.user?.name.charAt(0).toUpperCase()
                    )}
                  </div>
                    <span>{c.user?.name} {c.user?._id === user?._id ? '(You)' : ''}</span>
                  </div>

                  {/* Show Role and [X] button logic */}
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
      
      {/* --- USER PROFILE AT BOTTOM --- */}
      <div className="sidebar-profile">
        <NavLink to="/profile" className="profile-link">
           <div className="profile-avatar">
            
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="profile-avatar-img" />
            ) : (
              user?.name ? user.name.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          <span className="profile-name">{user?.name}</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;