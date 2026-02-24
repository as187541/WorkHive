// src/components/Sidebar.jsx
import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
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
      
      <nav className="sidebar-nav">
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