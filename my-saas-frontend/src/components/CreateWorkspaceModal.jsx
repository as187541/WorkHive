// src/components/CreateWorkspaceModal.jsx
import React, { useState } from 'react';

const CreateWorkspaceModal = ({ isOpen, onClose, onCreateSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateSubmit({ name, description });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Workspace</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="ws-name">Workspace Name</label>
            <input
              id="ws-name" type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q4 Marketing Campaign" required autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="ws-desc">Description (Optional)</label>
            <textarea
              id="ws-desc" value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3" placeholder="What is this workspace for?"
            ></textarea>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Workspace</button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateWorkspaceModal;