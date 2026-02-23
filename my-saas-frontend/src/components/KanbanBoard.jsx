import React from 'react';

const KanbanBoard = ({ tasks, onStatusChange, onDeleteTask, onTaskClick, currentUser, isAdmin }) => {
  const columns = ['Todo', 'In Progress', 'Done'];

  return (
    <div className="kanban-board">
      {columns.map(status => (
        <div key={status} className="kanban-column">
          <h3 className="column-title">{status}</h3>
          
          <div className="task-list">
            {tasks
              .filter(task => task.status === status)
              .map(task => {
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

                return (
                  <div 
                    key={task._id} 
                    className="task-card clickable-card"
                    onClick={() => onTaskClick(task)} // Open drawer on click
                  >
                    <div className="task-card-header">
                      <h4>{task.title}</h4>
                      {canDelete && (
                        <button 
                          className="btn-icon-delete" 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents opening the drawer
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
                          <span key={index} className="tag-pill">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <p className="task-description">
                        {task.description || 'No description...'}
                    </p>
                    
                    <div className="task-footer">
                      <div className="task-meta">
                        {task.dueDate && (
                          <span className={`due-date-badge ${dateClass}`}>
                          {isOverdue ? '⚠️ Overdue' : isDueSoon ? '⏳ Soon' : '📅'} {new Date(task.dueDate).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        )}
                        {task.assignedTo?.name ? (
                          <div className="assignee-avatar" 
                           title={`View ${task.assignedTo.name}'s profile`}
                            onClick={(e) => {
                                e.stopPropagation(); // Don't open task drawer
                                openProfile(task.assignedTo._id || task.assignedTo); // Open profile modal
                            }}
                          >
                            {task.assignedTo.name.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <div className="assignee-avatar unassigned">?</div>
                        )}
                        <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </div>

                      <select 
                        className="status-select"
                        value={task.status}
                        onClick={(e) => e.stopPropagation()} // Prevents opening the drawer when clicking the dropdown
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