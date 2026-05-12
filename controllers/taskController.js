// controllers/taskController.js
const Task = require('../models/taskModel');
const Workspace = require('../models/workspaceModel');
const User = require('../models/userModel');
const Project = require('../models/projectModel');
const cloudinary = require('cloudinary').v2;
const { emitTaskUpdate, emitNotification } = require('../utils/socket');



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

    // Emit real-time task update to project room
    emitTaskUpdate(projectId, { type: 'task_created', task: populatedTask });

    // Notify assigned user if any
    if (assignedTo && assignedTo !== '') {
      emitNotification(assignedTo, {
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned to task: ${title}`,
        data: { taskId: task._id, projectId }
      });
    }

    res.status(201).json(populatedTask  );
  } catch (error) {
    console.error("TASK CREATION ERROR:", error);
    res.status(500).json({ msg: 'Server Error', error: error.message });
  }
};


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


exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params; // This is the Task ID
    const { status } = req.body;
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }
    if (status === 'Done' && task.status !== 'Done' && !task.rewardProcessed) {
      const now = new Date();
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;

  
      if (dueDate && now < dueDate && task.assignedTo) {
        const rewards = { High: 30, Medium: 20, Low: 10 };
        const rewardAmount = rewards[task.priority] || 10;

        // Atomic update to user wallet
        await User.findByIdAndUpdate(task.assignedTo, {
          $inc: { 'wallet.balance': rewardAmount },
          $push: { 
            'wallet.history': { 
              amount: rewardAmount, 
              reason: `Early completion: ${task.title}`, 
              taskId: task._id,
              date: now
            } 
          }
        });
        

        req.body.rewardProcessed = true;
        req.body.completedAt = now;
      } else {
  
        req.body.rewardProcessed = true;
        req.body.completedAt = now;
      }
    }
      const updatedTask = await Task.findByIdAndUpdate(
      id, 
      req.body, 
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email avatar');

    // Emit real-time task update to project room
    const projectId = updatedTask.project?._id || updatedTask.project;
    if (projectId) {
      emitTaskUpdate(projectId.toString(), { type: 'task_updated', task: updatedTask });
    }

    // Notify assigned user about status changes
    if (updatedTask.assignedTo?._id && status) {
      emitNotification(updatedTask.assignedTo._id.toString(), {
        type: 'task_updated',
        title: 'Task Updated',
        message: `Task "${updatedTask.title}" status changed to ${status}`,
        data: { taskId: updatedTask._id, status }
      });
    }

    res.status(200).json(updatedTask);
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
    const isWorkspaceHead = memberRecord?.role === 'Admin';


    const project = await Project.findById(task.project);
    const isProjectLead = project && project.lead && project.lead.toString() === req.user._id.toString();
    
 
    const isCreator = task.createdBy && task.createdBy.toString() === req.user._id.toString();


    if (!isWorkspaceHead && !isProjectLead && !isCreator) {
      return res.status(403).json({ 
        msg: 'Permission denied. You must be the Workspace Head, Project Lead, or Task Creator to delete this.' 
      });
    }


    await task.deleteOne();
    res.status(200).json({ msg: 'Task removed' });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });


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

/**
 * @desc    Get all tasks for the current user (assigned to or created by)
 * @route   GET /api/v1/tasks/my
 * @access  Private
 */
exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user._id;

    const tasks = await Task.find({
      $or: [
        { assignedTo: userId },
        { createdBy: userId }
      ]
    })
      .populate('assignedTo', 'name email avatar')
      .populate({
        path: 'project',
        select: 'name workspace',
        populate: {
          path: 'workspace',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('getMyTasks error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};