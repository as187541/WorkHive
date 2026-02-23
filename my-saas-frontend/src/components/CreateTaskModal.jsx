import React, { useState } from 'react';

const CreateTaskModal = ({ isOpen, onClose, onCreateSubmit, members = [] }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    assignedTo: '',
    dueDate: '',  // New field
    tags: ''
  });
  
  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
  e.preventDefault();
  const taskData = {
    ...formData,
    tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== "")
  };
  onCreateSubmit(taskData);
  setFormData({ title: '', description: '', priority: 'Medium', assignedTo: '', dueDate: '', tags: '' });
};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Task</h2>
          <p>Add a new item to your project board.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Task Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Design landing page"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide more details about this task..."
              rows="3"
            ></textarea>
          </div>

           <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>Due Date</label>
              <input 
                type="date" 
                name="dueDate" 
                value={formData.dueDate} 
                onChange={handleChange} 
              />
            </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="form-group">
            <label>Assign To</label>
            <select name="assignedTo" value={formData.assignedTo} onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}>
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
         
            <div className="form-group">
              <label htmlFor="tags">Tags (comma separated)</label>
              <input
                type="text"
                id="tags"
                name="tags"
                placeholder="Design, Bug, Urgent"
                value={formData.tags}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;