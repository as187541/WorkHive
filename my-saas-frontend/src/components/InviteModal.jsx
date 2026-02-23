// src/components/InviteModal.jsx

import React, { useState, useEffect } from 'react';

/**
 * A modal component for inviting users to a workspace.
 * @param {object} props
 * @param {boolean} props.isOpen - Controls whether the modal is visible.
 * @param {function} props.onClose - Function to call when the modal should be closed.
 * @param {function} props.onInviteSubmit - Function to call with the email when the form is submitted.
 */
const InviteModal = ({ isOpen, onClose, onInviteSubmit }) => {
  const [email, setEmail] = useState('');

  // Effect to handle closing the modal with the 'Escape' key for better UX
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Add event listener only when the modal is open
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup function to remove the event listener when the modal closes
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]); // Dependencies array ensures this runs only when isOpen or onClose changes

  // If the modal is not supposed to be open, render nothing.
  if (!isOpen) {
    return null;
  }

  // Handle the form submission
  const handleSubmit = (event) => {
    event.preventDefault(); // Prevent default browser form submission
    if (email) {
      onInviteSubmit(email);
    }
  };

  return (
    // The semi-transparent background overlay
    <div className="modal-overlay" onClick={onClose}>
      {/* The modal content itself. Stop propagation to prevent closing when clicking inside. */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite Collaborator</h2>
          <p>Enter the email address of the user you want to add to this workspace.</p>
        </div>
        
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="invite-email">User's Email</label>
            <input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus // Automatically focuses the input when the modal opens
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;