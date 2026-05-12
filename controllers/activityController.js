const Activity = require('../models/activityModel');

/**
 * @desc    Log an activity
 * @param   {ObjectId} userId - The user performing the action
 * @param   {String} action - The action type (must match enum)
 * @param   {String} target - Human-readable description of the target
 * @param   {Object} options - Optional: { workspace, project, metadata }
 */
const logActivity = async (userId, action, target, options = {}) => {
  try {
    await Activity.create({
      user: userId,
      action,
      target,
      workspace: options.workspace || undefined,
      project: options.project || undefined,
      metadata: options.metadata || {}
    });
  } catch (err) {
    console.error('logActivity error:', err.message);
  }
};

/**
 * @desc    Get activities for the current user (across their workspaces)
 * @route   GET /api/v1/activities
 * @access  Private
 */
const getActivities = async (req, res) => {
  try {
    const { workspace, action, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const query = { user: userId };
    if (workspace && workspace !== 'all') {
      query.workspace = workspace;
    }
    if (action) {
      query.action = action;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('user', 'name avatar')
        .populate('workspace', 'name')
        .populate('project', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Activity.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: activities.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: activities
    });
  } catch (error) {
    console.error('getActivities error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get activities for a specific workspace
 * @route   GET /api/v1/activities/workspace/:workspaceId
 * @access  Private (workspace member)
 */
const getWorkspaceActivities = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { action, page = 1, limit = 20 } = req.query;

    const query = { workspace: workspaceId };
    if (action) {
      query.action = action;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('user', 'name avatar')
        .populate('workspace', 'name')
        .populate('project', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Activity.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: activities.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: activities
    });
  } catch (error) {
    console.error('getWorkspaceActivities error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = { logActivity, getActivities, getWorkspaceActivities };