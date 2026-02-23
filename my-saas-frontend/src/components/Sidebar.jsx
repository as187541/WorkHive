// src/components/Sidebar.jsx (Cleaned Up)
import React from 'react';
import { NavLink, useParams } from 'react-router-dom';

const Sidebar = ({ user, workspaces, collaborators, onInviteClick, onUserClick }) => {
  const { workspaceId } = useParams(); 

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">🚀 WorkHive</div>
      <nav className="sidebar-nav">
        {/* Workspaces Section */}
        <div className="nav-section">
          <h3 className="nav-title">Workspaces</h3>
          <ul>
            {workspaces.map(ws => (
              <li key={ws._id}><NavLink to={`/workspaces/${ws._id}`}>🗂️ {ws.name}</NavLink></li>
            ))}
          </ul>
        </div>
        
        {/* DYNAMIC SECTION: Only shows collaborators if a workspace is selected */}
        {workspaceId && (
            <div className="nav-section">
              <div className="nav-title-action">
                <h3 className="nav-title">Collaborators</h3>
                <button onClick={onInviteClick} className="invite-btn" title="Invite new member">+</button>
              </div>
              <ul>
                {collaborators.map((c) => (
                   <li 
                    key={c.user?._id} 
                    className="collaborator-item clickable-user"
                    // --- This will work now because it is defined in the props above ---
                    onClick={() => c.user && onUserClick(c.user._id)} 
                   >
                    <div className="profile-avatar" style={{width: '24px', height: '24px', fontSize: '0.7rem'}}>
                      {c.user ? c.user.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span>{c.user ? c.user.name : "Deleted User"}</span>
                    <span className="mini-role-tag">{c.role}</span>
                  </li>
                ))}
              </ul>
            </div>
        )}
      </nav>
      
      {/* Profile section at the bottom */}
      <div className="sidebar-profile">
        <NavLink to="/profile" className="profile-link">
          <div className="profile-avatar">{user?.name.charAt(0).toUpperCase()}</div>
          <span className="profile-name">{user?.name}</span>
        </NavLink>
      </div>
    </aside>
  );
};
export default Sidebar;