// controllers/taskController.js
const Task = require('../models/taskModel');
const Workspace = require('../models/workspaceModel');
/**
 * @desc    Create a new task within a project
 * @route   POST /api/v1/workspaces/:workspaceId/projects/:projectId/tasks
 */
exports.createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, priority, assignedTo, dueDate, tags } = req.body;

    if (!title) {
      return res.status(400).json({ msg: 'Please provide a task title' });
    }

    const task = await Task.create({
      title,
      description,
      priority: priority || 'Medium',
      project: projectId,
      assignedTo: assignedTo && assignedTo !== "" ? assignedTo : null, 
      createdBy: req.user._id,
      dueDate,
      tags 
    });
    const populatedTask = await task.populate('assignedTo', 'name email avatar');
    res.status(201).json(populatedTask  );
  } catch (error) {
    console.error("TASK CREATION ERROR:", error);
    res.status(500).json({ msg: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Get all tasks for a specific project
 * @route   GET /api/v1/workspaces/:workspaceId/projects/:projectId/tasks
 */
exports.getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Find tasks belonging to this project
    const tasks = await Task.find({ project: projectId })
    .populate('assignedTo', 'name email avatar')
    .sort({ createdAt: -1 });
    
    res.status(200).json(tasks);
  } catch (error) {
    console.error("GET TASKS ERROR:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Update a task (used for moving tasks between Kanban columns)
 * @route   PATCH /api/v1/workspaces/:workspaceId/projects/tasks/:id
 */
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params; // This is the Task ID

    const task = await Task.findByIdAndUpdate(
      id, 
      req.body, 
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }
      const populatedTask = await task.populate('assignedTo', 'name email avatar');
    res.status(200).json(populatedTask);
  } catch (error) {
    console.error("UPDATE TASK ERROR:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id, workspaceId } = req.params;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });



    
    const memberRecord = workspace.members.find(m => 
      m.user && m.user.toString() === req.user._id.toString()
    );

    const isAdmin = memberRecord?.role === 'Admin';
    
    const isCreator = task.createdBy && task.createdBy.toString() === req.user._id.toString();


    if (!isAdmin && !isCreator) {
      return res.status(403).json({ msg: 'Permission denied. You are not the Admin or Creator.' });
    }

    await task.deleteOne();
    res.status(200).json({ msg: 'Task removed' });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    // Upload to Cloudinary using the file buffer
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'workhive_attachments', resource_type: 'auto' },
      async (error, result) => {
        if (error) return res.status(500).json({ msg: 'Upload failed' });

        const task = await Task.findById(req.params.id);
        const newAttachment = {
          url: result.secure_url,
          name: req.file.originalname,
          publicId: result.public_id
        };

        task.attachments.push(newAttachment);
        await task.save();

        res.status(200).json(newAttachment);
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};
exports.deleteAttachment = async (req, res) => {
  try {
    const { id, publicId } = req.params; 

   
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

  
    await cloudinary.uploader.destroy(publicId);

    
    task.attachments = task.attachments.filter(att => att.publicId !== publicId);
    await task.save();

    res.status(200).json({ msg: 'Attachment deleted', attachments: task.attachments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
};