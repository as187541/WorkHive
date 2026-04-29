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
  const { user, collaborators, openProfile } = useOutletContext();

  // Data States
  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectSearch, setProjectSearch] = useState('');
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

  const isProjectLead = selectedProject?.lead?._id === currentUserIdStr || selectedProject?.lead === currentUserIdStr;

  const projectMembers = collaborators.filter(collab => {
    if (!selectedProject) return false;

    const leadId = String(selectedProject.lead?._id || selectedProject.lead || "");
    const memberIds = (selectedProject.members || []).map(m => String(m._id || m));
    const collabUserId = String(collab.user?._id || collab.user || "");

    
    const isLead = leadId === collabUserId;
    const isMember = memberIds.includes(collabUserId);
    return isLead || isMember;
  });

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

  const handleDeleteWorkspace = async () => {
  const confirmMsg = isAdmin
    ? "⚠️ PERMANENT ACTION: Are you sure you want to DELETE this workspace and all its data? This cannot be undone."
    : "Are you sure you want to LEAVE this workspace?";

  if (window.confirm(confirmMsg)) {
    try {
      // Calls DELETE /api/v1/workspaces/:workspaceId
      const res = await api.delete(`/workspaces/${workspaceId}`);
      alert(res.data.msg);
      
      // Redirect to the dashboard
      navigate('/');
      
      // Force a window reload to clear the deleted workspace from the Sidebar
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || "Action failed.");
    }
  }
};

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

 const handleCreateProject = async ({ name, leadId, memberIds }) => {
    try {
      const res = await api.post(`/workspaces/${workspaceId}/projects`, { name, leadId, memberIds });
      setProjects(prev => [...prev, res.data]);
      setIsProjectModalOpen(false);
      handleProjectClick(res.data);
    } catch { 
      alert("Failed to create project."); 
    }
  };

  const handleAddMemberToProject = async (userIdToAdd) => {
    if (!userIdToAdd) return;
    try {
      const res = await api.post(`/workspaces/${workspaceId}/projects/${selectedProject._id}/members`, { 
        userIdToAdd 
      });
      
      const updatedProject = res.data;
      setProjects(prev => prev.map(p => p._id === updatedProject._id ? updatedProject : p));
      setSelectedProject(updatedProject);
      
      alert("Team updated!");
    } catch {
      alert("Failed to add member.");
    }
  };

  const handleRemoveMemberFromProject = async (userIdToRemove) => {
    if (!window.confirm("Remove this member from the project?")) return;
    try {
      const res = await api.delete(`/workspaces/${workspaceId}/projects/${selectedProject._id}/members/${userIdToRemove}`);
      const updatedProject = res.data.data;
      setProjects(prev => prev.map(p => p._id === updatedProject._id ? updatedProject : p));
      setSelectedProject(updatedProject);
      alert("Member removed from project.");
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to remove member.");
    }
  };

  const handleRemoveMemberFromWorkspace = async (userIdToRemove) => {
    if (!isAdmin) {
      alert("Only workspace admins can remove members.");
      return;
    }
    if (!window.confirm("Remove this member from the workspace? They will lose access to all projects.")) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${userIdToRemove}`);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to remove member.");
    }
  };

  const handleUpdateProject = async () => {
    const newName = window.prompt("Rename Project:", selectedProject.name);
    if (!newName) return;
    try {
      const res = await api.patch(`/workspaces/${workspaceId}/projects/${selectedProject._id}`, { name: newName });
      setProjects(projects.map(p => p._id === selectedProject._id ? res.data : p));
      setSelectedProject(res.data);
    } catch { 
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
      } catch { 
        alert("Delete failed."); 
      }
    }
  };
  
        // Filter projects based on search
      const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().startsWith(projectSearch.toLowerCase())
      );

      // Filter tasks assigned to the CURRENT user (for the "My Focus" feature)
      const myTasks = tasks.filter(t => 
        (t.assignedTo?._id === currentUserIdStr || t.assignedTo === currentUserIdStr) && 
        t.status !== 'Done'
      );

  const handleCreateTask = async (taskData) => {
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${selectedProject._id}/tasks`, taskData);
      handleProjectClick(selectedProject);
      setIsTaskModalOpen(false);
    } catch { 
      alert("Failed to create task."); 
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.patch(`/workspaces/${workspaceId}/projects/tasks/${taskId}`, { status: newStatus });
      // Use the helper to sync
      const taskToUpdate = tasks.find(t => t._id === taskId);
      handleTaskUpdate({ ...taskToUpdate, status: res.data.status });
    } catch { 
      alert("Status update failed"); 
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/projects/tasks/${taskId}`);
      setTasks(tasks.filter(t => t._id !== taskId));
      if (activeTask?._id === taskId) setIsDrawerOpen(false);
    } catch { 
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
          const progressPercentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
          const highPriorityCount = tasks.filter(t => t.priority === 'High').length;
if (selectedProject) {
  console.log("--- PROJECT DEBUG ---");
  console.log("Selected Project Name:", selectedProject.name);
  console.log("Project Lead ID:", selectedProject.lead?._id || selectedProject.lead);
  console.log("Project Members Array:", selectedProject.members);
  console.log("All Workspace Collaborators:", collaborators);
}
  return (
    <div className="workspace-detail-container">
      <header className="page-header">
        <div>
          <h1>{workspace.name}</h1>
          <p className="page-description">{workspace.description || 'Workspace overview'}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-danger-text" onClick={handleDeleteWorkspace}>
            {isAdmin ? '🗑️ Delete Workspace' : '🚪 Leave Workspace'}
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setIsProjectModalOpen(true)}>+ New Project</button>
          )}
        </div>
      </header>

      <div className="project-layout">
       
  <aside className="project-list-container">
  {/* Refined Header & Search */}
  <div className="side-section-header">
    <h3 className="side-small-title">Projects</h3>
    <div className="side-search-wrapper">
      <span className="search-icon-tiny">🔍</span>
      <input 
        type="text" 
        placeholder="Search..." 
        value={projectSearch}
        onChange={(e) => setProjectSearch(e.target.value)}
      />
    </div>
  </div>

  <div className="project-scroll-area">
    <ul className="project-list">
      {filteredProjects.map(p => (
        <li 
          key={p._id} 
          className={`project-list-item ${selectedProject?._id === p._id ? 'active' : ''}`} 
          onClick={() => handleProjectClick(p)}
        >
          <span>{p.name}</span>
          {currentUserIdStr === (p.lead?._id || p.lead) && (
                    <span className="role-dot" title="Project Lead"></span>
                  )}
        </li>
      ))}
    </ul>
  </div>

  <hr className="side-divider" />

  {/* 3. NEW FEATURE: "My Focus" (Interactive Personal Queue) */}
  <div className="my-focus-area">
    <h3 className="side-small-title">My Focus ({myTasks.length})</h3>
    <div className="focus-list">
      {myTasks.length > 0 ? (
        myTasks.map(task => (
          <div 
            key={task._id} 
            className="focus-item" 
            onClick={() => handleTaskClick(task)} /* Opens Task Drawer instantly */
          >
            <span className={`focus-priority ${task.priority.toLowerCase()}`}></span>
            <div className="focus-text">
              <p className="focus-title">{task.title}</p>
              <span className="focus-project-name">{selectedProject?.name}</span>
            </div>
          </div>
        ))
      ) : (
        <div className="focus-empty">
          <p>You're all caught up! 🚀</p>
        </div>
      )}
    </div>
  </div>
</aside>

        <main className="file-explorer-container"> 
          {selectedProject ? (
            <>
              <div className="section-header">
                <div className="project-title-area">
                  <h2>{selectedProject.name}</h2>
                  {isAdmin && (
                    <div className="project-actions-mini">
                      {/* Workspace Head OR Project Lead can edit project details */}
                    {(isAdmin || isProjectLead) && (
                      <button onClick={handleUpdateProject} title="Edit Project">✏️</button>
                    )}
                    {/* ONLY Workspace Head can delete the project */}
                    {isAdmin && (
                      <button onClick={handleDeleteProject} title="Delete Project">🗑️</button>
                    )}
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
                      openProfile={openProfile}
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

              {/* 4. Team Members Section (Professional) */}
              <div className="insight-group team-management">
                <div className="team-header">
                  <label className="meta-label">Active Team</label>
                  <span className="team-count">{projectMembers.length} members</span>
                </div>
                
                <div className="team-list">
                  {projectMembers.map((c) => (
                    <div key={c.user?._id} className="team-member-row">
                      <div 
                        className="team-member-info" 
                        onClick={() => openProfile(c.user?._id)}
                      >
                        <div className="team-avatar">
                          {c.user?.avatar ? (
                            <img src={c.user.avatar} alt={c.user.name} />
                          ) : (
                            <span>{c.user?.name?.charAt(0)?.toUpperCase()}</span>
                          )}
                        </div>
                        <div className="team-member-details">
                          <span className="team-member-name">{c.user?.name}</span>
                          <span className="team-member-role">
                            {String(selectedProject.lead?._id || selectedProject.lead) === String(c.user?._id) ? 'Lead' : 'Member'}
                          </span>
                        </div>
                      </div>
                      
                      {(isAdmin || isProjectLead) && 
                       String(c.user?._id) !== String(selectedProject.lead?._id || selectedProject.lead) && (
                        <button 
                          className="btn-remove-member"
                          onClick={() => handleRemoveMemberFromProject(c.user?._id)}
                          title="Remove from project"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {(isAdmin || isProjectLead) && (
                  <div className="team-actions">
                    <select 
                      className="modern-select-tiny"
                      value=""
                      onChange={(e) => { if(e.target.value) handleAddMemberToProject(e.target.value); }}
                    >
                      <option value="">+ Add Member</option>
                      {collaborators
                        .filter(c => !projectMembers.some(pm => String(pm.user?._id) === String(c.user?._id)))
                        .map(c => (
                          <option key={c.user?._id} value={c.user?._id}>{c.user?.name}</option>
                        ))
                      }
                    </select>
                  </div>
                )}
              </div>

              {/* 5. Workspace Members Section */}
              <div className="insight-group workspace-team">
                <div className="team-header">
                  <label className="meta-label">Workspace Team</label>
                  <span className="team-count">{collaborators.length} members</span>
                </div>
                
                <div className="team-list compact">
                  {collaborators.map((c) => (
                    <div key={c.user?._id} className="team-member-row">
                      <div 
                        className="team-member-info" 
                        onClick={() => openProfile(c.user?._id)}
                      >
                        <div className="team-avatar small">
                          {c.user?.avatar ? (
                            <img src={c.user.avatar} alt={c.user.name} />
                          ) : (
                            <span>{c.user?.name?.charAt(0)?.toUpperCase()}</span>
                          )}
                        </div>
                        <div className="team-member-details">
                          <span className="team-member-name">{c.user?.name}</span>
                          <span className={`team-member-role ${c.role?.toLowerCase()}`}>{c.role}</span>
                        </div>
                      </div>
                      
                      {isAdmin && String(c.user?._id) !== currentUserIdStr && (
                        <button 
                          className="btn-remove-member"
                          onClick={() => handleRemoveMemberFromWorkspace(c.user?._id)}
                          title="Remove from workspace"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </aside>
      </div>

      <CreateProjectModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        onCreateSubmit={handleCreateProject} 
        collaborators={collaborators}
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