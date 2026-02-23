// src/components/TaskDetailDrawer.jsx
import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const TaskDetailDrawer = ({ task, isOpen, onClose, workspaceId, onTaskUpdate }) => {
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const commentEndRef = useRef(null); // For auto-scrolling

  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    commentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && task) {
      setAttachments(task.attachments || []);
      
      api.get(`/workspaces/${workspaceId}/projects/tasks/${task._id}/comments`)
        .then(res => {
          setComments(res.data);
          // Small timeout to let the DOM render before scrolling
          setTimeout(scrollToBottom, 100);
        })
        .catch(err => console.error("Failed to fetch comments:", err));
    }
  }, [isOpen, task, workspaceId]);

  // Scroll every time comments change
  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await api.post(`/workspaces/${workspaceId}/projects/tasks/${task._id}/comments`, {
        content: newComment
      });
      setComments([...comments, res.data]);
      setNewComment('');
    } catch (err) {
      alert("Failed to post comment");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) return alert("File too large (Max 5MB)");

    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    try {
      const res = await api.post(
        `/workspaces/${workspaceId}/projects/tasks/${task._id}/attachments`, 
        formData, 
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      const updatedAttachments = [...attachments, res.data];
      setAttachments(updatedAttachments);
      
      // CRUCIAL: Notify the parent (WorkspaceDetail) that this task now has a new attachment
      // so the data isn't "lost" when reopening the drawer.
      if (onTaskUpdate) {
        onTaskUpdate({ ...task, attachments: updatedAttachments });
      }

      setIsUploading(false);
    } catch (err) {
      alert("Upload failed.");
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (publicId) => {
  if (!window.confirm("Delete this attachment permanently?")) return;

  try {
    await api.delete(`/workspaces/${workspaceId}/projects/tasks/${task._id}/attachments/${encodeURIComponent(publicId)}`);
    
    
    const updatedAttachments = attachments.filter(att => att.publicId !== publicId);
    setAttachments(updatedAttachments);

    
    if (onTaskUpdate) {
      onTaskUpdate({ ...task, attachments: updatedAttachments });
    }
  } catch (err) {
    alert("Failed to delete attachment.");
  }
};

  if (!isOpen || !task) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>&times;</button>
        
        <div className="drawer-body-scrollable"> {/* Wrap everything in a scrollable container */}
          <div className="drawer-header">
            <h2>{task.title}</h2>
            <div className="drawer-meta-section">
              <div className="meta-item">
                <span className="meta-label">Priority</span>
                <span className={`priority-tag ${task.priority?.toLowerCase()}`}>
                  {task.priority}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Due Date</span>
                <span className="meta-value">
                  {task.dueDate ? (
                    <>📅 {new Date(task.dueDate).toLocaleDateString(undefined, { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}</>
                  ) : (
                    <span style={{color: 'var(--text-secondary)'}}>No deadline</span>
                  )}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Assignee</span>
                <span className="meta-value">
                  {task.assignedTo?.name ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="assignee-avatar" style={{width: '20px', height: '20px', fontSize: '0.6rem'}}>
                        {task.assignedTo.name.charAt(0).toUpperCase()}
                      </div>
                      {task.assignedTo.name}
                    </div>
                  ) : "Unassigned"}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Status</span>
                <span className="meta-value" style={{ textTransform: 'capitalize' }}>
                  {task.status}
                </span>
              </div>
            </div>

            {/* 3. Description Section */}
            <p className="drawer-desc">{task.description || 'No description provided.'}</p>
                                  {task.tags && task.tags.length > 0 && (
                        <div className="drawer-tags-section" style={{ marginTop: 'var(--spacing-6)' }}>
                          <span className="meta-label" style={{ display: 'block', marginBottom: '8px' }}>
                            Tags
                          </span>
                          <div className="task-tags">
                            {task.tags.map((tag, index) => (
                              <span key={index} className="tag-pill drawer-tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
          </div>

          <hr className="drawer-divider" />

          {/* ATTACHMENTS */}
          <div className="attachments-section">
            <h3>Attachments ({attachments.length})</h3>
            <div className="attachment-list">
              {attachments.map((file) => (
                <div key={file.publicId} className="attachment-item">
                  <div className="attachment-info">
                    <span className="file-icon">📎</span>
                    <a href={file.url} target="_blank" rel="noreferrer">{file.name}</a>
                  </div>
                  
                  {/* NEW: Delete Button */}
                  <button 
                    className="btn-delete-attachment"
                    onClick={() => handleDeleteAttachment(file.publicId)}
                    title="Delete attachment"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            {/* More Prominent Upload Button */}
            <div className="upload-container">
              <label className={`btn-upload-prominent ${isUploading ? 'loading' : ''}`}>
                {isUploading ? '⏳ Uploading...' : '📤 Upload Attachment'}
                <input type="file" onChange={handleFileUpload} hidden disabled={isUploading} />
              </label>
            </div>
          </div>

          <hr className="drawer-divider" />

          {/* COMMENTS */}
          <div className="comments-section">
            <h3>Activity & Comments</h3>
            <div className="comment-list">
              {comments.map(c => (
                <div key={c._id} className="comment-item">
                  <div className="comment-meta">
                    <strong>{c.user?.name}</strong> 
                    <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="comment-content">{c.content}</p>
                </div>
              ))}
              <div ref={commentEndRef} /> {/* Hidden element to scroll to */}
            </div>
          </div>
        </div>

        {/* Comment Form is FIXED at the bottom of the drawer */}
        <div className="drawer-footer-form">
          <form onSubmit={handlePostComment} className="comment-form-fixed">
            <input 
              placeholder="Write a comment..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              required
            />
            <button type="submit" className="btn-send-action">Post Comment </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailDrawer;