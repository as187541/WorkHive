// src/components/KanbanBoard.jsx
import React, { useState, useEffect } from 'react';
import { FiList, FiColumns } from 'react-icons/fi';

const KanbanBoard = ({ tasks, onStatusChange, onDeleteTask, openProfile, onTaskClick, currentUser, isAdmin }) => {
  const columns = ['Todo', 'In Progress', 'Done'];
  const [viewMode, setViewMode] = useState('board');

  // Auto-switch to list on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768 && viewMode === 'board') {
        setViewMode('list');
      }
    };
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getRewardAmount = (priority) => {
    const rewards = { High: 30, Medium: 20, Low: 10 };
    return rewards[priority] || 10;
  };

  const renderTaskCard = (task) => {
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
            <div 
              className={`assignee-avatar ${!assignee?.name ? 'unassigned' : ''}`} 
              title={assignee?.name ? `View ${assignee.name}'s profile` : 'Unassigned'}
              style={{ zIndex: 10, position: 'relative' }}
              onClick={(e) => {
                e.stopPropagation();
                if (openProfile && userIdToOpen) {
                  openProfile(userIdToOpen);
                }
              }}
            >
              {assignee?.avatar ? (
                <img src={assignee.avatar} className="profile-avatar-img" alt="" />
              ) : (
                <span>{assignee?.name ? assignee.name.charAt(0).toUpperCase() : '?'}</span>
              )}
            </div>
            <div className={`reward-tag ${task.rewardProcessed ? 'earned' : 'potential'}`}>
               {task.rewardProcessed ? '✨' : '🪙'} {getRewardAmount(task.priority)}
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
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <div className="kanban-view-toggle">
          <button 
            className={viewMode === 'list' ? 'active' : ''} 
            onClick={() => setViewMode('list')}
          >
            <FiList size={14} /> List
          </button>
          <button 
            className={viewMode === 'board' ? 'active' : ''} 
            onClick={() => setViewMode('board')}
          >
            <FiColumns size={14} /> Board
          </button>
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="kanban-board">
          {columns.map(status => (
            <div key={status} className="kanban-column">
              <h3 className="column-title">{status}</h3>
              <div className="task-list">
                {tasks
                  .filter(task => task.status === status)
                  .map(task => renderTaskCard(task))}
                {tasks.filter(task => task.status === status).length === 0 && (
                  <div className="empty-column-text">No tasks {status.toLowerCase()}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="kanban-list-view">
          {columns.map(status => {
            const columnTasks = tasks.filter(task => task.status === status);
            return (
              <div key={status} className="kanban-list-section">
                <div className="kanban-list-section-header">
                  {status} <span className="count">{columnTasks.length}</span>
                </div>
                <div className="kanban-list-section-body">
                  {columnTasks.length > 0 ? (
                    columnTasks.map(task => renderTaskCard(task))
                  ) : (
                    <div className="empty-column-text">No tasks {status.toLowerCase()}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;