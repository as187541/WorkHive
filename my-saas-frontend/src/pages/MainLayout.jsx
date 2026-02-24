// src/pages/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import InviteModal from '../components/InviteModal';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import UserProfileModal from '../components/UserProfileModal';
import api from '../services/api';

const MainLayout = () => {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
     const openInviteModal = () => setIsInviteModalOpen(true);
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  // Load User and Workspaces
  useEffect(() => {
    setLoading(true);
    Promise.all([api.get('/auth/me'), api.get('/workspaces')])
      .then(([userRes, workspacesRes]) => {
        setUser(userRes.data);
        setWorkspaces(workspacesRes.data);
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/login');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // Load Members when workspace changes
  useEffect(() => {
    if (!workspaceId) {
      setCollaborators([]);
      return;
    }
    api.get(`/workspaces/${workspaceId}/members`)
      .then(res => setCollaborators(res.data))
      .catch(() => setCollaborators([]));
  }, [workspaceId]);

  // --- FUNCTIONAL LOGIC ---

  const handleCreateWorkspace = async (formData) => {
    try {
      const res = await api.post('/workspaces', formData);
      setWorkspaces(prev => [...prev, res.data]); // Update sidebar list
      setIsCreateModalOpen(false); // Close modal
      navigate(`/workspaces/${res.data._id}`); // Go to new workspace
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to create workspace.");
    }
  };

  const handleInviteSubmit = async (email) => {
    if (!workspaceId) return;
    try {
      const res = await api.post(`/workspaces/${workspaceId}/members`, { email });
      alert(res.data.msg); // "Invitation sent!"
      setIsInviteModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to send invitation.");
    }
  };

  const openProfile = (id) => setSelectedProfileId(id);

  if (loading) return <div className="loading-screen">Loading WorkHive...</div>;

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        workspaces={workspaces}
        collaborators={collaborators}
        onInviteClick={() => setIsInviteModalOpen(true)}
        onUserClick={openProfile}
      />
      <div className="main-content-wrapper">
        <Navbar user={user} onCreateWorkspaceClick={() => setIsCreateModalOpen(true)} />
        <main className="page-content">
          <Outlet context={{ user, workspaces, collaborators, openProfile, openInviteModal }} />
        </main>
      </div>

      <UserProfileModal 
        isOpen={!!selectedProfileId} 
        userId={selectedProfileId} 
        onClose={() => setSelectedProfileId(null)} 
      />

      <InviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onInviteSubmit={handleInviteSubmit} // Pass actual function
      />

      <CreateWorkspaceModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onCreateSubmit={handleCreateWorkspace} // Pass actual function
      />
    </div>
  );
};

export default MainLayout;