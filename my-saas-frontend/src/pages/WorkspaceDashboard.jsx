import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import InviteModal from '../components/InviteModal';
import WorkspaceCard from '../components/WorkspaceCard';
import api from '../services/api';

const WorkspaceDashboard = () => {
  // This is the key change. We provide a default empty object.
  const { workspaces } = useOutletContext() || { workspaces: [] }; 
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  const handleOpenInviteModal = (workspace) => {
    setSelectedWorkspace(workspace);
    setIsInviteModalOpen(true);
  };
  const handleCloseInviteModal = () => setIsInviteModalOpen(false);

  const handleInviteSubmit = async (email) => {
    if (!selectedWorkspace) return;
    try {
      const endpoint = `/workspaces/${selectedWorkspace._id}/members`;
      const response = await api.post(endpoint, { email });
      alert(response.data.msg);
      handleCloseInviteModal();
    } catch (error) {
      alert(error.response?.data?.msg || "Failed to send invite.");
    }
  };

  return (
    <>
      <header className="page-header">
        <h1>Workspaces</h1>
        <button className="btn btn-primary">Create New Workspace</button>
      </header>
      <div className="content-grid">
        {workspaces && workspaces.length > 0 ? (
          workspaces.map((ws) => (
            <WorkspaceCard 
              key={ws._id} 
              workspace={ws} 
              onInviteClick={handleOpenInviteModal} 
            />
          ))
        ) : (
          <div className="empty-state">
            <h3>Welcome!</h3>
            <p>Select a Workspace from the left tab or Create your own by clicking on new workspace.</p>
          </div>
        )}
      </div>
      <InviteModal 
        isOpen={isInviteModalOpen} 
        onClose={handleCloseInviteModal} 
        onInviteSubmit={handleInviteSubmit} 
      />
    </>
  );
};
export default WorkspaceDashboard;