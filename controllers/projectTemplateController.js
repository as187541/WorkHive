const ProjectTemplate = require('../models/projectTemplateModel');
const Project = require('../models/projectModel');
const Task = require('../models/taskModel');

/**
 * @desc    Get all project templates
 * @route   GET /api/v1/project-templates
 * @access  Private
 */
const getProjectTemplates = async (req, res) => {
  try {
    const templates = await ProjectTemplate.find()
      .sort({ category: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('getProjectTemplates error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get a single project template
 * @route   GET /api/v1/project-templates/:id
 * @access  Private
 */
const getProjectTemplate = async (req, res) => {
  try {
    const template = await ProjectTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ msg: 'Template not found.' });
    }

    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('getProjectTemplate error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Create a project from template
 * @route   POST /api/v1/project-templates/:id/create
 * @access  Private
 */
const createProjectFromTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { workspaceId, name, lead, members } = req.body;

    if (!workspaceId || !name || !lead) {
      return res.status(400).json({ msg: 'Please provide workspace, name, and lead.' });
    }

    const template = await ProjectTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ msg: 'Template not found.' });
    }

    // Create the project
    const project = await Project.create({
      name,
      workspace: workspaceId,
      lead,
      members: members || [lead],
      status: 'Active'
    });

    // Create default tasks from template
    if (template.defaultTasks && template.defaultTasks.length > 0) {
      const tasks = template.defaultTasks.map(task => ({
        title: task.title,
        description: task.description,
        status: 'Todo',
        priority: task.priority,
        project: project._id,
        tags: task.tags || [],
        createdBy: req.user._id,
        dueDate: task.estimatedDays ? new Date(Date.now() + task.estimatedDays * 24 * 60 * 60 * 1000) : undefined
      }));

      await Task.insertMany(tasks);
    }

    res.status(201).json({
      success: true,
      msg: `Project "${name}" created from template "${template.name}"`,
      data: project
    });
  } catch (error) {
    console.error('createProjectFromTemplate error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Create a custom project template
 * @route   POST /api/v1/project-templates
 * @access  Private (Admin only)
 */
const createProjectTemplate = async (req, res) => {
  try {
    const { name, description, category, phases, defaultTasks } = req.body;

    if (!name) {
      return res.status(400).json({ msg: 'Please provide a template name.' });
    }

    const template = await ProjectTemplate.create({
      name,
      description,
      category: category || 'Custom',
      phases: phases || [],
      defaultTasks: defaultTasks || [],
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('createProjectTemplate error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  getProjectTemplates,
  getProjectTemplate,
  createProjectFromTemplate,
  createProjectTemplate
};
