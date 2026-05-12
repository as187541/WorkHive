import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FiFilter, FiCheckSquare, FiClock, FiAlertCircle, FiFolder } from 'react-icons/fi';
import api from '../services/api';

const MyTasksPage = () => {
  const navigate = useNavigate();
  const { workspaces } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const res = await api.get('/tasks/my');
        const taskData = res.data.data || res.data || [];
        setTasks(taskData);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setError('Failed to load tasks. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  // Group tasks by workspace/project
  const workspaceMap = {};
  (workspaces || []).forEach(ws => {
    workspaceMap[ws._id] = ws.name;
  });

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    // Status filter
    if (statusFilter === 'pending' && task.status === 'Done') return false;
    if (statusFilter === 'done' && task.status !== 'Done') return false;
    if (statusFilter === 'in-progress' && task.status !== 'In Progress') return false;
    if (statusFilter === 'todo' && task.status !== 'Todo') return false;

    // Workspace filter
    if (selectedWorkspace !== 'all') {
      const taskProject = task.project;
      const projectId = taskProject?._id || taskProject;
      // We need to check if the task's project belongs to the selected workspace
      // Since project is populated, we can check task.project.workspace
      const projectWorkspace = taskProject?.workspace?._id || taskProject?.workspace;
      if (projectWorkspace !== selectedWorkspace) return false;
    }

    return true;
  });

  // Group filtered tasks by project
  const groupedTasks = {};
  filteredTasks.forEach(task => {
    const projectName = task.project?.name || 'Unknown Project';
    const projectWorkspace = task.project?.workspace?._id || task.project?.workspace || 'unknown';
    const groupKey = `${projectWorkspace}_${projectName}`;
    if (!groupedTasks[groupKey]) {
      groupedTasks[groupKey] = {
        projectName,
        workspaceId: projectWorkspace,
        workspaceName: workspaceMap[projectWorkspace] || 'Unknown Workspace',
        tasks: []
      };
    }
    groupedTasks[groupKey].tasks.push(task);
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Done': return <FiCheckSquare style={{ color: '#10b981' }} />;
      case 'In Progress': return <FiClock style={{ color: '#f59e0b' }} />;
      case 'Todo': return <FiAlertCircle style={{ color: '#3b82f6' }} />;
      default: return <FiCheckSquare />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Todo': { bg: '#eff6ff', color: '#3b82f6' },
      'In Progress': { bg: '#fffbeb', color: '#f59e0b' },
      'Done': { bg: '#ecfdf5', color: '#10b981' }
    };
    const style = colors[status] || { bg: '#f3f4f6', color: '#6b7280' };
    return (
      <span className="task-status-badge" style={{ backgroundColor: style.bg, color: style.color }}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      'High': { bg: '#fef2f2', color: '#ef4444' },
      'Medium': { bg: '#fffbeb', color: '#f59e0b' },
      'Low': { bg: '#ecfdf5', color: '#10b981' }
    };
    const style = colors[priority] || { bg: '#f3f4f6', color: '#6b7280' };
    return (
      <span className="task-priority-badge" style={{ backgroundColor: style.bg, color: style.color }}>
        {priority}
      </span>
    );
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diff = date - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return <span style={{ color: '#ef4444' }}>Overdue by {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''}</span>;
    if (days === 0) return <span style={{ color: '#f59e0b' }}>Due today</span>;
    if (days === 1) return <span style={{ color: '#f59e0b' }}>Due tomorrow</span>;
    if (days <= 7) return <span style={{ color: '#f59e0b' }}>Due in {days} days</span>;
    return <span style={{ color: 'var(--text-secondary)' }}>Due {date.toLocaleDateString()}</span>;
  };

  if (loading) {
    return (
      <div className="my-tasks-page page-enter">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-tasks-page page-enter">
        <div className="empty-state">
          <FiAlertCircle size={48} />
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-tasks-page page-enter">
      <div className="my-tasks-header">
        <div>
          <h1>My Tasks</h1>
          <p className="page-subtitle">All tasks assigned to you or created by you, organized by workspace</p>
        </div>
      </div>

      <div className="my-tasks-filters">
        <div className="filter-group">
          <FiFilter size={16} />
          <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Workspaces</option>
            {(workspaces || []).map(ws => (
              <option key={ws._id} value={ws._id}>{ws.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="pending">Pending (Not Done)</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Completed</option>
            <option value="all">All Tasks</option>
          </select>
        </div>
        <div className="filter-stats">
          <span className="filter-stat">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <FiCheckSquare size={48} />
          <h3>No tasks found</h3>
          <p>
            {statusFilter === 'pending'
              ? 'You have no pending tasks. Great job!'
              : 'No tasks match your current filters.'}
          </p>
          <button className="btn-primary" onClick={() => navigate('/workspaces')}>
            Go to Workspaces
          </button>
        </div>
      ) : (
        <div className="my-tasks-groups">
          {Object.entries(groupedTasks).map(([key, group]) => (
            <div key={key} className="task-group">
              <div className="task-group-header" onClick={() => navigate(`/workspaces/${group.workspaceId}`)}>
                <div className="task-group-title">
                  <FiFolder size={18} />
                  <div>
                    <h3>{group.projectName}</h3>
                    <span className="task-group-workspace">{group.workspaceName}</span>
                  </div>
                </div>
                <span className="task-group-count">{group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="task-group-list">
                {group.tasks.map(task => (
                  <div key={task._id} className="my-task-item">
                    <div className="my-task-item-left">
                      {getStatusIcon(task.status)}
                      <div className="my-task-item-info">
                        <span className="my-task-item-title">{task.title}</span>
                        <div className="my-task-item-meta">
                          {getStatusBadge(task.status)}
                          {getPriorityBadge(task.priority)}
                          {task.assignedTo?.name && (
                            <span className="my-task-assignee">
                              Assigned to: {task.assignedTo.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="my-task-item-right">
                      {task.dueDate && formatDueDate(task.dueDate)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTasksPage;