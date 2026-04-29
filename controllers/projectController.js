const Project = require('../models/projectModel');
const Workspace = require('../models/workspaceModel');
const Task = require('../models/taskModel');

/**
 * @desc    Create a new project
 * @route   POST /api/v1/workspaces/:workspaceId/projects
 * @access  Workspace Head (Admin) only
 */
const createProject = async (req, res) => {
  try {
    const { name, leadId, memberIds } = req.body; 
    const { workspaceId } = req.params;
    const userId = req.user._id;

    if (!name) return res.status(400).json({ msg: 'Project name is required.' });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found.' });

    // HIERARCHY CHECK: Only Workspace Head (Admin) can create projects
    const isAdmin = workspace.members.find(
      m => m.user && m.user.toString() === userId.toString() && m.role === 'Admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ msg: 'Only Workspace Heads can create projects.' });
    }

    // Default to the creator if no leadId is provided, otherwise use provided leadId
    const finalLeadId = leadId || userId;

    const newProject = await Project.create({
      name,
      workspace: workspaceId,
      lead: finalLeadId,
      members: Array.from(new Set([finalLeadId, ...(memberIds || [])]))  
    });

    const populatedProject = await newProject.populate('lead', 'name email avatar');
    res.status(201).json(populatedProject);
  } catch (error) {
    console.error("CREATE PROJECT ERROR:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all projects for a workspace
 * @route   GET /api/v1/workspaces/:workspaceId/projects
 * @access  Workspace Head (All) / Project Lead & Member (Assigned only)
 */
const getProjectsForWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found.' });

    // HIERARCHY LOGIC:
    // 1. Is user a Workspace Head (Admin)?
    const isAdmin = workspace.members.find(
      m => m.user && m.user.toString() === userId.toString() && m.role === 'Admin'
    );
    let query = { workspace: workspaceId };
    let projects;
    if (isAdmin) {
      // Workspace Head sees ALL projects in the workspace
      projects = await Project.find({ workspace: workspaceId }).populate('lead', 'name email avatar');
    } else {
      // Project Lead/Members only see projects they are assigned to
      projects = await Project.find({ 
        workspace: workspaceId,
        $or: [
          { lead: userId },
          { members: userId }
        ]
      }).populate('lead', 'name email avatar');
    }

    res.status(200).json(projects);
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Update a project
 * @route   PATCH /api/v1/workspaces/:workspaceId/projects/:projectId
 * @access  Workspace Head OR Project Lead
 */
const updateProject = async (req, res) => {
  try {
    const { projectId, workspaceId } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    const project = await Project.findById(projectId);

    if (!project) return res.status(404).json({ msg: 'Project not found.' });

    // HIERARCHY CHECK: Workspace Admin OR the specific Project Lead
    const isAdmin = workspace.members.find(m => m.user.toString() === userId.toString() && m.role === 'Admin');
    const isProjectLead = project.lead.toString() === userId.toString();

    if (!isAdmin && !isProjectLead) {
      return res.status(403).json({ msg: 'Permission denied. Only Workspace Head or Project Lead can update.' });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      projectId, 
      req.body, 
      { new: true, runValidators: true }
    ).populate('lead', 'name email avatar');

    res.status(200).json(updatedProject);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};


/**
 * @desc    Delete a project and its tasks
 * @route   DELETE /api/v1/workspaces/:workspaceId/projects/:projectId
 * @access  Workspace Head only
 */
const deleteProject = async (req, res) => {
  try {
    const { projectId, workspaceId } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    
    // HIERARCHY CHECK: Only Workspace Head (Admin) can delete a project entirely
    const isAdmin = workspace.members.find(m => m.user.toString() === userId.toString() && m.role === 'Admin');

    if (!isAdmin) {
      return res.status(403).json({ msg: 'Only Workspace Heads can delete projects.' });
    }

    // 1. Delete associated tasks
    await Task.deleteMany({ project: projectId });
    // 2. Delete project
    await Project.findByIdAndDelete(projectId);

    res.status(200).json({ msg: 'Project and tasks deleted' });
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

const addProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userIdToAdd } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    // Hierarchy Check: Only the Project Lead or Workspace Admin can add members
    const isLead = project.lead.toString() === req.user._id.toString();

    if (!isLead) {
      return res.status(403).json({ msg: "Permission denied. Only the Project Lead can manage team members." });
    }

    // Add member if not already in the array
    if (!project.members.includes(userIdToAdd)) {
      project.members.push(userIdToAdd);
      await project.save();
    }

    res.status(200).json(project);
  } catch (error) {
    console.error("ADD MEMBER ERROR:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

/**
 * @desc    Remove a member from a project
 * @route   DELETE /api/v1/workspaces/:workspaceId/projects/:projectId/members/:userId
 * @access  Project Lead or Workspace Admin
 */
const removeProjectMember = async (req, res) => {
  try {
    const { projectId, workspaceId, userId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: "Workspace not found" });

    // Hierarchy Check: Project Lead or Workspace Admin can remove members
    const isLead = project.lead.toString() === req.user._id.toString();
    const isAdmin = workspace.members.find(
      m => m.user.toString() === req.user._id.toString() && m.role === 'Admin'
    );

    if (!isLead && !isAdmin) {
      return res.status(403).json({ msg: "Permission denied. Only Project Lead or Workspace Admin can remove members." });
    }

    // Cannot remove the project lead
    if (userId === project.lead.toString()) {
      return res.status(400).json({ msg: "Cannot remove the project lead. Transfer lead first." });
    }

    // Remove member from project
    project.members = project.members.filter(m => m.toString() !== userId);
    await project.save();

    const updatedProject = await Project.findById(projectId)
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar');
    res.status(200).json({ msg: "Member removed from project.", data: updatedProject });
  } catch (error) {
    console.error("REMOVE PROJECT MEMBER ERROR:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

module.exports = { 
  createProject, 
  getProjectsForWorkspace, 
  updateProject, 
  deleteProject,
  addProjectMember,
  removeProjectMember
};