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
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const openProfile = (id) => {
    setSelectedProfileId(id);
  };

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

  useEffect(() => {
    if (!workspaceId) {
      setActiveWorkspace(null);
      setCollaborators([]);
      return;
    }
    Promise.all([
      api.get(`/workspaces/${workspaceId}`),
      api.get(`/workspaces/${workspaceId}/members`)
    ])
    .then(([workspaceDetailsRes, membersRes]) => {
      setActiveWorkspace(workspaceDetailsRes.data);
      setCollaborators(membersRes.data);
    })
    .catch(err => {
      console.error("Failed to fetch workspace details:", err);
      navigate('/');
    });
  }, [workspaceId, navigate]);

  const handleCreateWorkspace = async (formData) => {
    try {
      const res = await api.post('/workspaces', formData);
      setWorkspaces(prev => [...prev, res.data]);
      setIsCreateModalOpen(false);
      navigate(`/workspaces/${res.data._id}`);
    } catch (err) { alert(err.response?.data?.msg || "Failed to create."); }
  };

  const handleInviteSubmit = async (email) => {
    if (!workspaceId) return alert("No workspace selected.");
    try {
      const res = await api.post(`/workspaces/${workspaceId}/members`, { email });
      alert(res.data.msg);
      setIsInviteModalOpen(false);
      const updatedMembers = await api.get(`/workspaces/${workspaceId}/members`);
      setCollaborators(updatedMembers.data);
    } catch (err) { alert(err.response?.data?.msg || "Failed to invite."); }
  };

  if (loading) return <div>Loading Application...</div>;

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
          <Outlet context={{ user, collaborators, openProfile }} />
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
        onInviteSubmit={handleInviteSubmit}
      />
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateSubmit={handleCreateWorkspace}
      />
    </div>
  );
};

export default MainLayout;