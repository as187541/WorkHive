const Comment = require('../models/commentModel');

// @desc    Add a comment to a task
// @route   POST /api/v1/workspaces/:workspaceId/projects/tasks/:taskId/comments
exports.addComment = async (req, res) => {
  try {
    const comment = await Comment.create({
      content: req.body.content,
      task: req.params.taskId,
      user: req.user._id
    });

    // Populate user info so frontend can show who commented immediately
    const populatedComment = await comment.populate('user', 'name');

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Get all comments for a task
// @route   GET /api/v1/workspaces/:workspaceId/projects/tasks/:taskId/comments
exports.getTaskComments = async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('user', 'name')
      .sort({ createdAt: 1 }); // Oldest first (chat style)

    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};