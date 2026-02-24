// src/components/KanbanBoard.jsx
import React from 'react';

const KanbanBoard = ({ tasks, onStatusChange, onDeleteTask, openProfile, onTaskClick, currentUser, isAdmin }) => {
  const columns = ['Todo', 'In Progress', 'Done'];

  // DEBUG LOG 1: Check if the function arrived from the parent
  console.log("KanbanBoard Component Rendered. openProfile type:", typeof openProfile);

  return (
    <div className="kanban-board">
      {columns.map(status => (
        <div key={status} className="kanban-column">
          <h3 className="column-title">{status}</h3>
          
          <div className="task-list">
            {tasks
              .filter(task => task.status === status)
              .map(task => {
                // 1. Permission & Date Calculations
                const creatorId = String(task.createdBy?._id || task.createdBy || "");
                const currentUserId = String(currentUser?._id || currentUser?.id || "");
                const canDelete = isAdmin || (creatorId !== "" && creatorId === currentUserId);
                
                const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const isOverdue = dueDateObj && dueDateObj < today && task.status !== 'Done';
                const isDueSoon = 
                    dueDateObj && 
                    dueDateObj >= today && 
                    dueDateObj <= new Date(today.getTime() + (2 * 24 * 60 * 60 * 1000)) && 
                    task.status !== 'Done';

                const dateClass = isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : '';

                // 2. Data Normalization for Assignee
                const assignee = task.assignedTo;
                const userIdToOpen = assignee?._id || (typeof assignee === 'string' ? assignee : null);

                return (
                  <div 
                    key={task._id} 
                    className="task-card clickable-card"
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="task-card-header">
                      <h4>{task.title}</h4>
                      {canDelete && (
                        <button 
                          className="btn-icon-delete" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm('Delete this task?')) onDeleteTask(task._id);
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {task.tags && task.tags.length > 0 && (
                      <div className="task-tags">
                        {task.tags.map((tag, index) => (
                          <span key={index} className="tag-pill">{tag}</span>
                        ))}
                      </div>
                    )}
                    
                    <p className="task-description">
                        {task.description || 'No description...'}
                    </p>
                    
                    <div className="task-footer">
                      <div className="task-meta">
                        
                        {/* --- REINFORCED AVATAR BLOCK --- */}
                        <div 
                          className={`assignee-avatar ${!assignee?.name ? 'unassigned' : ''}`} 
                          title={assignee?.name ? `View ${assignee.name}'s profile` : 'Unassigned'}
                          style={{ zIndex: 10, position: 'relative' }} // Ensures click priority
                          onClick={(e) => {
                            e.stopPropagation(); // Stops the task drawer from opening
                            
                            console.log("--- AVATAR CLICK REGISTERED ---");
                            console.log("Task:", task.title);
                            console.log("Raw Assignee Data:", assignee);
                            console.log("Extracted ID to open:", userIdToOpen);
                            console.log("openProfile function type:", typeof openProfile);

                            if (openProfile && userIdToOpen) {
                              openProfile(userIdToOpen);
                            } else {
                              console.error("Action failed: Missing profile function or user ID.");
                            }
                          }}
                        >
                          {assignee?.avatar ? (
                            <img src={assignee.avatar} className="profile-avatar-img" alt="" />
                          ) : (
                            <span>{assignee?.name ? assignee.name.charAt(0).toUpperCase() : '?'}</span>
                          )}
                        </div>

                        {task.dueDate && (
                          <span className={`due-date-badge ${dateClass}`}>
                            {isOverdue ? '⚠️' : isDueSoon ? '⏳' : '📅'} {new Date(task.dueDate).toLocaleDateString(undefined, { 
                              month: 'short', day: 'numeric' 
                            })}
                          </span>
                        )}

                        <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </div>

                      <select 
                        className="status-select"
                        value={task.status}
                        onClick={(e) => e.stopPropagation()} 
                        onChange={(e) => {
                          e.stopPropagation(); 
                          onStatusChange(task._id, e.target.value);
                        }}
                      >
                        {columns.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            
            {tasks.filter(task => task.status === status).length === 0 && (
              <div className="empty-column-text">No tasks {status.toLowerCase()}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;