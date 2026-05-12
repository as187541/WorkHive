const Activity = require('../models/activityModel');
const Workspace = require('../models/workspaceModel');

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
 * @desc    Get activities for the current user across their workspaces
 * @route   GET /api/v1/activities
 * @access  Private
 */
const getActivities = async (req, res) => {
  try {
    const { workspace, action, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    // Find all workspaces the user belongs to
    const userWorkspaces = await Workspace.find({ 'members.user': userId }).select('_id');
    const workspaceIds = userWorkspaces.map(ws => ws._id);

    // Build query: activities from any user in the current user's workspaces
    const query = { workspace: { $in: workspaceIds } };
    if (workspace && workspace !== 'all') {
      query.workspace = workspace;
    }
    if (action) {
      // Support multiple action types via repeated query params (e.g. ?action=task_created&action=task_assigned)
      const actions = Array.isArray(action) ? action : [action];
      query.action = actions.length === 1 ? actions[0] : { $in: actions };
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