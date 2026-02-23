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

  if (!isOpen || !task) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>&times;</button>
        
        <div className="drawer-body-scrollable"> {/* Wrap everything in a scrollable container */}
          <div className="drawer-header">
            <span className={`priority-tag ${task.priority?.toLowerCase()}`}>
              {task.priority} Priority
            </span>
            <h2>{task.title}</h2>
            <p className="drawer-desc">{task.description || 'No description provided.'}</p>
          </div>

          <hr className="drawer-divider" />

          {/* ATTACHMENTS */}
          <div className="attachments-section">
            <h3>Attachments ({attachments.length})</h3>
            <div className="attachment-list">
              {attachments.map((file, idx) => (
                <div key={file.publicId || idx} className="attachment-item">
                  <span className="file-icon">📎</span>
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    {file.name}
                  </a>
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