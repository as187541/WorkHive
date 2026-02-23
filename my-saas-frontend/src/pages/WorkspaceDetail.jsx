// src/pages/WorkspaceDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import api from '../services/api';
import CreateProjectModal from '../components/CreateProjectModal';
import KanbanBoard from '../components/KanbanBoard';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailDrawer from '../components/TaskDetailDrawer';

const WorkspaceDetail = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user, collaborators } = useOutletContext();

  // Data States
  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  
  // State for Side Drawer
  const [activeTask, setActiveTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Permission logic
  const currentUserIdStr = String(user?._id || user?.id || "");
  const currentUserMember = workspace?.members?.find(m => String(m.user?._id || m.user) === currentUserIdStr);
  const isAdmin = currentUserMember?.role === 'Admin';

  useEffect(() => {
    if (workspaceId) {
      setLoading(true);
      setSelectedProject(null);
      setTasks([]);
      setIsDrawerOpen(false);
      
      Promise.all([
        api.get(`/workspaces/${workspaceId}`),
        api.get(`/workspaces/${workspaceId}/projects`)
      ])
      .then(([workspaceRes, projectsRes]) => {
        setWorkspace(workspaceRes.data);
        setProjects(projectsRes.data);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
    }
  }, [workspaceId, navigate]);

  // --- NEW: Sync function to keep the Drawer and the Kanban board in sync ---
  const handleTaskUpdate = (updatedTask) => {
    // Update the task in the main list
    setTasks(prevTasks => prevTasks.map(t => t._id === updatedTask._id ? updatedTask : t));
    // Update the task currently being viewed in the drawer
    setActiveTask(updatedTask);
  };

  const handleProjectClick = async (project) => {
    setSelectedProject(project);
    setTasksLoading(true);
    setSearchTerm('');
    setFilterAssignee('all');
    try {
      const res = await api.get(`/workspaces/${workspaceId}/projects/${project._id}/tasks`);
      setTasks(res.data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setTasksLoading(false); 
    }
  };

  const handleTaskClick = (task) => {
    setActiveTask(task);
    setIsDrawerOpen(true);
  };

  const handleCreateProject = async ({ name }) => {
    try {
      const res = await api.post(`/workspaces/${workspaceId}/projects`, { name });
      setProjects(prev => [...prev, res.data]);
      setIsProjectModalOpen(false);
      handleProjectClick(res.data);
    } catch (err) { 
      alert("Failed to create project."); 
    }
  };

  const handleUpdateProject = async () => {
    const newName = window.prompt("Rename Project:", selectedProject.name);
    if (!newName) return;
    try {
      const res = await api.patch(`/workspaces/${workspaceId}/projects/${selectedProject._id}`, { name: newName });
      setProjects(projects.map(p => p._id === selectedProject._id ? res.data : p));
      setSelectedProject(res.data);
    } catch (err) { 
      alert("Update failed."); 
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm("Delete project and all its tasks?")) {
      try {
        await api.delete(`/workspaces/${workspaceId}/projects/${selectedProject._id}`);
        setProjects(projects.filter(p => p._id !== selectedProject._id));
        setSelectedProject(null);
        setTasks([]);
      } catch (err) { 
        alert("Delete failed."); 
      }
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${selectedProject._id}/tasks`, taskData);
      handleProjectClick(selectedProject);
      setIsTaskModalOpen(false);
    } catch (err) { 
      alert("Failed to create task."); 
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.patch(`/workspaces/${workspaceId}/projects/tasks/${taskId}`, { status: newStatus });
      // Use the helper to sync
      const taskToUpdate = tasks.find(t => t._id === taskId);
      handleTaskUpdate({ ...taskToUpdate, status: res.data.status });
    } catch (err) { 
      alert("Status update failed"); 
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/projects/tasks/${taskId}`);
      setTasks(tasks.filter(t => t._id !== taskId));
      if (activeTask?._id === taskId) setIsDrawerOpen(false);
    } catch (err) { 
      alert("Delete failed."); 
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAssignee = filterAssignee === 'all' 
      ? true 
      : filterAssignee === 'unassigned' 
        ? !t.assignedTo 
        : (t.assignedTo?._id === filterAssignee || t.assignedTo === filterAssignee);

    return matchesSearch && matchesAssignee;
  });

  if (loading) return <div className="page-content">Loading Workspace...</div>;
  if (!workspace) return <div className="page-content"><h1>Workspace Not Found</h1></div>;

            const totalTasks = tasks.length;
          const doneTasks = tasks.filter(t => t.status === 'Done').length;
          const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
          const todoTasks = tasks.filter(t => t.status === 'Todo').length;

          // Percentage of completion
          const progressPercentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

          // Priority counts
          const highPriorityCount = tasks.filter(t => t.priority === 'High').length;

  return (
    <div className="workspace-detail-container">
      <header className="page-header">
        <div>
          <h1>{workspace.name}</h1>
          <p className="page-description">{workspace.description || 'Workspace overview'}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => {/* Delete workspace logic */}}>
             {isAdmin ? '🗑️ Delete Workspace' : '🚪 Leave Workspace'}
          </button>
          <button className="btn btn-primary" onClick={() => setIsProjectModalOpen(true)}>+ New Project</button>
        </div>
      </header>

      <div className="project-layout">
        <aside className="project-list-container">
          <h2 className="section-title">Projects</h2>
          <ul className="project-list">
            {projects.map(p => (
              <li 
                key={p._id} 
                className={`project-list-item ${selectedProject?._id === p._id ? 'active' : ''}`} 
                onClick={() => handleProjectClick(p)}
              >
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
        </aside>

        <main className="file-explorer-container"> 
          {selectedProject ? (
            <>
              <div className="section-header">
                <div className="project-title-area">
                  <h2>{selectedProject.name}</h2>
                  {isAdmin && (
                    <div className="project-actions-mini">
                      <button onClick={handleUpdateProject} title="Edit Project">✏️</button>
                      <button onClick={handleDeleteProject} title="Delete Project">🗑️</button>
                    </div>
                  )}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setIsTaskModalOpen(true)}>+ Add Task</button>
              </div>

               <div className="filter-bar-enhanced">
                <input 
                  type="text" 
                  placeholder="Search tasks..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="search-input-small" 
                />
                
                <select 
                  className="filter-select"
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                >
                  <option value="all">All Members</option>
                  <option value="unassigned">Unassigned</option>
                  {collaborators.map(c => (
                    <option key={c.user?._id} value={c.user?._id}>
                      {c.user?.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {tasksLoading ? <p>Loading tasks...</p> : (
                <KanbanBoard 
                    tasks={filteredTasks} 
                    onStatusChange={handleStatusChange} 
                    onDeleteTask={handleDeleteTask}
                    onTaskClick={handleTaskClick}
                    currentUser={user}
                    isAdmin={isAdmin}
                />
              )}
            </>
          ) : (
            <div className="empty-state-centered">
              <div className="empty-icon">📂</div>
              <h3>Select a project to view tasks</h3>
            </div>
          )}
        </main>

         <aside className="project-details-container">
              <h2 className="section-title">Project Insights</h2>

              {/* 1. Overall Progress Section */}
              <div className="insight-card">
                <div className="insight-header">
                  <label>Overall Progress</label>
                  <span className="progress-value">{progressPercentage}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
                </div>
              </div>

              {/* 2. Task Breakdown Section */}
              <div className="insight-group">
                <label className="meta-label">Task Status</label>
                <div className="stats-row">
                  <div className="stat-box">
                    <span className="stat-num">{todoTasks}</span>
                    <span className="stat-label">Todo</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-num">{inProgressTasks}</span>
                    <span className="stat-label">Active</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-num highlight">{doneTasks}</span>
                    <span className="stat-label">Done</span>
                  </div>
                </div>
              </div>

              <hr className="drawer-divider-mini" />

              {highPriorityCount > 0 && (
                <div className="alert-card">
                  <span className="alert-icon">🔥</span>
                  <div>
                    <label>High Priority</label>
                    <p>{highPriorityCount} tasks need urgent attention</p>
                  </div>
                </div>
              )}

              {/* 4. Team Members Section (Enhanced) */}
              <div className="insight-group">
                <label className="meta-label">Active Team</label>
                <div className="team-stack">
                  {collaborators.slice(0, 5).map((c, i) => (
                    <div key={i} className="assignee-avatar" title={c.user?.name}>
                      {c.user?.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {collaborators.length > 5 && (
                    <div className="avatar-more">+{collaborators.length - 5}</div>
                  )}
                </div>
                <p className="team-caption">{collaborators.length} members in workspace</p>
              </div>
            </aside>
      </div>

      <CreateProjectModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        onCreateSubmit={handleCreateProject} 
      />
      
      <CreateTaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        onCreateSubmit={handleCreateTask} 
        members={collaborators} 
      />
      
      {/* TASK DRAWER with UPDATE SYNC logic */}
      <TaskDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        task={activeTask}
        workspaceId={workspaceId}
        onTaskUpdate={handleTaskUpdate} // Pass the sync function here
      />
    </div>
  );
};

export default WorkspaceDetail;