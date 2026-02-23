// controllers/projectController.js
const Project = require('../models/projectModel');
const Workspace = require('../models/workspaceModel');
const Task = require('../models/taskModel');

// @desc    Create a new project
// @route   POST /api/v1/workspaces/:workspaceId/projects
const createProject = async (req, res) => {
  try {
    const { name } = req.body;
    const { workspaceId } = req.params;
    const leadId = req.user._id;

    if (!name) return res.status(400).json({ msg: 'Project name is required.' });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found.' });

    const newProject = await Project.create({
      name,
      workspace: workspaceId,
      lead: leadId,
    });
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Get all projects for a workspace
// @route   GET /api/v1/workspaces/:workspaceId/projects
const getProjectsForWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const projects = await Project.find({ workspace: workspaceId });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Update a project
// @route   PATCH /api/v1/workspaces/:workspaceId/projects/:projectId
const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.projectId, 
      req.body, 
      { new: true }
    );
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Delete a project and its tasks
// @route   DELETE /api/v1/workspaces/:workspaceId/projects/:projectId
const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    // 1. Delete associated tasks
    await Task.deleteMany({ project: projectId });
    // 2. Delete project
    await Project.findByIdAndDelete(projectId);
    res.status(200).json({ msg: 'Project and tasks deleted' });
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// --- MAKE SURE ALL 4 ARE EXPORTED ---
module.exports = { 
  createProject, 
  getProjectsForWorkspace, 
  updateProject, 
  deleteProject 
};