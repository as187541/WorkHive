// src/pages/DashboardPage.jsx

import React, { useState } from 'react';
import InviteModal from '../components/InviteModal';
import WorkspaceCard from '../components/WorkspaceCard';
import api from '../services/api';

/**
 * Renders the main dashboard view for workspaces.
 * @param {object} props - The props object.
 * @param {Array} props.workspaces - The list of workspace objects fetched from the API.
 */
const WorkspaceDashboard = ({ workspaces }) => {
  // State for controlling the visibility of the invite modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  // State to remember which workspace we are inviting a member to
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  // --- Event Handlers ---

  // This function is triggered when the "Invite" button on a card is clicked
  const handleOpenInviteModal = (workspace) => {
    setSelectedWorkspace(workspace);
    setIsInviteModalOpen(true);
  };

  // This function closes the modal
  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
    setSelectedWorkspace(null); // Clear the selected workspace
  };

  // This function is called when the form inside the modal is submitted
  const handleInviteSubmit = async (email) => {
    if (!selectedWorkspace) {
      alert("Error: No workspace selected.");
      return;
    }
    try {
      const endpoint = `/workspaces/${selectedWorkspace._id}/members`;
      const response = await api.post(endpoint, { email });
      
      alert(response.data.msg); // Show success message from the backend
      handleCloseInviteModal(); // Close the modal on success
      // In a real app, you would also refresh the collaborators list here
    } catch (error) {
      // Show the specific error message from the backend if it exists
      alert(error.response?.data?.msg || "An error occurred. Failed to send invite.");
    }
  };

  // --- Render Logic ---

  return (
    <>
      <header className="page-header">
        <h1>Workspaces</h1>
        <button className="btn btn-primary">Create New Workspace</button>
      </header>

      <div className="content-grid">
        {/* Check if workspaces exist and the array is not empty */}
        {workspaces && workspaces.length > 0 ? (
          // If yes, map over them and render a card for each one
          workspaces.map((ws) => (
            <WorkspaceCard 
              key={ws._id} 
              workspace={ws} 
              onInviteClick={handleOpenInviteModal} 
            />
          ))
        ) : (
          // If no, show a helpful "empty state" message
          <div className="empty-state">
            <h3>Welcome to your Dashboard!</h3>
            <p>You don't have any workspaces yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {/* The Invite Modal is always in the DOM but only visible when isOpen is true */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={handleCloseInviteModal}
        onInviteSubmit={handleInviteSubmit}
      />
    </>
  );
};

export default WorkspaceDashboard;