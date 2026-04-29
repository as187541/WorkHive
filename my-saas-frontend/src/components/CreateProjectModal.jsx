import React, { useState, useEffect } from 'react';
import { FiUser, FiFolderPlus } from 'react-icons/fi';

const CreateProjectModal = ({ isOpen, onClose, onCreateSubmit, collaborators = [] }) => {
  const [name, setName] = useState('');
  const [leadId, setLeadId] = useState('');
  const [memberIds, setMemberIds] = useState([]);

  // DEBUGGING: Remove these logs after it starts working
  useEffect(() => {
    if (isOpen) {
      console.log("Modal opened. Collaborators received:", collaborators);
    }
  }, [isOpen, collaborators]);

  useEffect(() => {
    // Ensure collaborators is an array and has items
    const membersArray = Array.isArray(collaborators) ? collaborators : [];
    
    if (isOpen && membersArray.length > 0) {
      const defaultLead = membersArray[0].user?._id || membersArray[0].user;
      setLeadId(defaultLead);
      setMemberIds([defaultLead]);
    }
  }, [isOpen, collaborators]);

  if (!isOpen) return null;

  const membersArray = Array.isArray(collaborators) ? collaborators : [];

  const handleToggleMember = (id) => {
  // Convert IDs to strings for a safe check
  const idStr = String(id);
  const leadIdStr = String(leadId);

  if (idStr === leadIdStr) return; // Can't remove the lead

  setMemberIds(prev => 
    prev.map(String).includes(idStr) 
      ? prev.filter(mId => String(mId) !== idStr) 
      : [...prev, idStr]
  );
};

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateSubmit({ name, leadId, memberIds });
    setName('');
    setMemberIds([]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content project-modal" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-icon-header">
          <FiFolderPlus />
        </div>
        
        <h2>Create New Project</h2>
        <p className="modal-description">Setup your team and project details.</p>

        <form onSubmit={handleSubmit}>
          {/* Project Name */}
          <div className="form-group">
            <label>Project Name</label>
            <input 
              type="text" 
              className="form-input"
              placeholder="e.g. Website Redesign"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          {/* Project Lead */}
          <div className="form-group">
            <label>Project Lead</label>
            {membersArray.length > 0 ? (
              <select 
                className="form-select"
                value={leadId} 
                onChange={(e) => setLeadId(e.target.value)}
                required
              >
                {membersArray.map(c => (
                  <option key={c.user?._id} value={c.user?._id}>
                    {c.user?.name || "Unknown Member"}
                  </option>
                ))}
              </select>
            ) : (
              <p className="error-text">No collaborators found in this workspace.</p>
            )}
          </div>

          {/* Member Multi-Selection */}
          <div className="form-group">
            <label>Add Team Members</label>
            <div className="member-selection-grid">
              {membersArray.length > 0 ? (
                membersArray.map(c => (
                  <div 
                    key={c.user?._id} 
                    className={`member-chip ${memberIds.includes(c.user?._id) ? 'selected' : ''}`}
                    onClick={() => handleToggleMember(c.user?._id)}
                  >
                    <img src={c.user?.avatar || '/default-avatar.png'} alt="" />
                    {c.user?.name}
                  </div>
                ))
              ) : (
                <p className="text-muted text-center">Loading members...</p>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;