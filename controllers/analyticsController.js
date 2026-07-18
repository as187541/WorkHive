// controllers/analyticsController.js
const mongoose = require('mongoose');
const Workspace = require('../models/workspaceModel');
const Project = require('../models/projectModel');
const Task = require('../models/taskModel');
const User = require('../models/userModel');
const Activity = require('../models/activityModel');
const Order = require('../models/orderModel');
const JobPosting = require('../models/jobPostingModel');
const Proposal = require('../models/proposalModel');
const Rating = require('../models/ratingModel');
const RedemptionRequest = require('../models/redemptionRequestModel');

// Helper: safely convert string to ObjectId
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

/**
 * Helper: verify user is member of workspace
 */
const isWorkspaceMember = (workspace, userId) => {
  return workspace.members && workspace.members.some(
    m => m.user.toString() === userId.toString()
  );
};

/**
 * @desc    Get workspace overview stats
 * @route   GET /api/v1/analytics/workspace/:workspaceId/overview
 */
const getWorkspaceOverview = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const wsOid = toObjectId(workspaceId);

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });
    if (!isWorkspaceMember(workspace, req.user._id) && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ msg: 'Not a member of this workspace' });
    }

    const [projectCount, taskStats, memberCount, totalTokens] = await Promise.all([
      Project.countDocuments({ workspace: wsOid }),
      Task.aggregate([
        { $lookup: { from: 'projects', localField: 'project', foreignField: '_id', as: 'proj' } },
        { $match: { 'proj.workspace': wsOid } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      workspace.members.length,
      User.aggregate([
        { $match: { 'wallet.workspaces.workspace': wsOid } },
        { $unwind: '$wallet.workspaces' },
        { $match: { 'wallet.workspaces.workspace': wsOid } },
        { $group: { _id: null, totalTokens: { $sum: '$wallet.workspaces.balance' } } }
      ])
    ]);

    const tasksByStatus = {};
    taskStats.forEach(s => { tasksByStatus[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        workspaceId,
        workspaceName: workspace.name,
        projects: projectCount,
        tasks: tasksByStatus,
        totalTasks: Object.values(tasksByStatus).reduce((a, b) => a + b, 0),
        members: memberCount,
        totalTokens: totalTokens[0]?.totalTokens || 0
      }
    });
  } catch (error) {
    console.error('getWorkspaceOverview error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get activity trends for workspace
 * @route   GET /api/v1/analytics/workspace/:workspaceId/activity-trends
 */
const getActivityTrends = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { period = 'daily', days = 30 } = req.query;
    const wsOid = toObjectId(workspaceId);

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });
    if (!isWorkspaceMember(workspace, req.user._id) && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ msg: 'Not a member of this workspace' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let groupId;
    if (period === 'weekly') {
      groupId = { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } };
    } else if (period === 'monthly') {
      groupId = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    } else {
      groupId = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
    }

    const trends = await Activity.aggregate([
      { $match: { workspace: wsOid, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { ...groupId, action: '$action' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ]);

    // Reshape for frontend: { date: string, actions: { [action]: count } }
    const result = {};
    trends.forEach(t => {
      const dateKey = period === 'monthly'
        ? `${t._id.year}-${String(t._id.month).padStart(2, '0')}`
        : period === 'weekly'
          ? `${t._id.year}-W${String(t._id.week).padStart(2, '0')}`
          : `${t._id.year}-${String(t._id.month).padStart(2, '0')}-${String(t._id.day).padStart(2, '0')}`;

      if (!result[dateKey]) result[dateKey] = { date: dateKey, actions: {} };
      result[dateKey].actions[t._id.action] = t.count;
    });

    res.json({ success: true, data: Object.values(result) });
  } catch (error) {
    console.error('getActivityTrends error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get contractor utilization for workspace
 * @route   GET /api/v1/analytics/workspace/:workspaceId/contractor-utilization
 */
const getContractorUtilization = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const wsOid = toObjectId(workspaceId);

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });
    if (!isWorkspaceMember(workspace, req.user._id) && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ msg: 'Not a member of this workspace' });
    }

    // Get contractors in workspace projects
    const projects = await Project.find({ workspace: wsOid });
    const projectIds = projects.map(p => p._id);

    // Aggregate tasks by assignee
    const taskStats = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$assignedTo', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] } } } }
    ]);

    // Get ratings for contractors
    const contractorIds = taskStats.map(t => t._id).filter(Boolean);
    const ratings = await Rating.aggregate([
      { $match: { ratee: { $in: contractorIds }, workspace: wsOid } },
      { $group: { _id: '$ratee', avgScore: { $avg: '$score' }, ratingCount: { $sum: 1 } } }
    ]);

    const ratingMap = {};
    ratings.forEach(r => { ratingMap[r._id.toString()] = r; });

    // Get user details
    const users = await User.find({ _id: { $in: contractorIds } }).select('name avatar');

    const data = taskStats.filter(t => t._id).map(t => {
      const user = users.find(u => u._id.toString() === t._id.toString());
      const rating = ratingMap[t._id.toString()];
      return {
        userId: t._id,
        name: user?.name || 'Unknown',
        avatar: user?.avatar || '',
        tasksAssigned: t.total,
        tasksCompleted: t.completed,
        completionRate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
        avgRating: rating?.avgScore ? Math.round(rating.avgScore * 10) / 10 : null,
        ratingCount: rating?.ratingCount || 0
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('getContractorUtilization error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get token economy for workspace
 * @route   GET /api/v1/analytics/workspace/:workspaceId/token-economy
 */
const getTokenEconomy = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const wsOid = toObjectId(workspaceId);

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });
    if (!isWorkspaceMember(workspace, req.user._id) && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ msg: 'Not a member of this workspace' });
    }

    // Aggregate wallet history for this workspace
    const tokenFlow = await User.aggregate([
      { $match: { 'wallet.history.workspace': wsOid } },
      { $unwind: '$wallet.history' },
      { $match: { 'wallet.history.workspace': wsOid } },
      {
        $group: {
          _id: {
            $cond: {
              if: { $gte: ['$wallet.history.amount', 0] },
              then: 'earned',
              else: 'spent'
            }
          },
          total: { $sum: { $abs: '$wallet.history.amount' } },
          count: { $sum: 1 }
        }
      }
    ]);

    const earned = tokenFlow.find(t => t._id === 'earned') || { total: 0, count: 0 };
    const spent = tokenFlow.find(t => t._id === 'spent') || { total: 0, count: 0 };

    // Redemption stats
    const redemptionStats = await RedemptionRequest.aggregate([
      { $match: { workspace: wsOid } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalCost: { $sum: '$cost' } } }
    ]);

    const redemptions = {};
    redemptionStats.forEach(r => { redemptions[r._id.toLowerCase()] = { count: r.count, totalCost: r.totalCost }; });

    // Token distribution by user
    const distribution = await User.aggregate([
      { $match: { 'wallet.workspaces.workspace': wsOid } },
      { $unwind: '$wallet.workspaces' },
      { $match: { 'wallet.workspaces.workspace': wsOid } },
      { $project: { name: 1, balance: '$wallet.workspaces.balance' } },
      { $sort: { balance: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        earned: earned.total,
        earnedCount: earned.count,
        spent: spent.total,
        spentCount: spent.count,
        redemptions,
        distribution
      }
    });
  } catch (error) {
    console.error('getTokenEconomy error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get job conversion funnel for workspace
 * @route   GET /api/v1/analytics/workspace/:workspaceId/job-conversion
 */
const getJobConversion = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const wsOid = toObjectId(workspaceId);

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });
    if (!isWorkspaceMember(workspace, req.user._id) && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ msg: 'Not a member of this workspace' });
    }

    const [jobStats, proposalStats, orderStats] = await Promise.all([
      JobPosting.aggregate([
        { $match: { workspace: wsOid } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Proposal.aggregate([
        { $lookup: { from: 'jobpostings', localField: 'jobPosting', foreignField: '_id', as: 'job' } },
        { $match: { 'job.workspace': wsOid } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { workspace: wsOid } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const jobsByStatus = {};
    jobStats.forEach(s => { jobsByStatus[s._id] = s.count; });

    const proposalsByStatus = {};
    proposalStats.forEach(s => { proposalsByStatus[s._id] = s.count; });

    const ordersByStatus = {};
    orderStats.forEach(s => { ordersByStatus[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        totalPosted: Object.values(jobsByStatus).reduce((a, b) => a + b, 0),
        jobsByStatus,
        totalProposals: Object.values(proposalsByStatus).reduce((a, b) => a + b, 0),
        proposalsByStatus,
        totalOrders: Object.values(ordersByStatus).reduce((a, b) => a + b, 0),
        ordersByStatus
      }
    });
  } catch (error) {
    console.error('getJobConversion error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get project velocity for workspace
 * @route   GET /api/v1/analytics/workspace/:workspaceId/project-velocity
 */
const getProjectVelocity = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { weeks = 12 } = req.query;
    const wsOid = toObjectId(workspaceId);

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });
    if (!isWorkspaceMember(workspace, req.user._id) && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ msg: 'Not a member of this workspace' });
    }

    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - parseInt(weeks) * 7);

    const velocity = await Task.aggregate([
      {
        $lookup: { from: 'projects', localField: 'project', foreignField: '_id', as: 'proj' }
      },
      { $unwind: '$proj' },
      { $match: { 'proj.workspace': wsOid, status: 'Done', completedAt: { $gte: weeksAgo } } },
      {
        $group: {
          _id: {
            project: '$proj.name',
            week: { $dateFromParts: { isoWeekYear: { $isoWeekYear: '$completedAt' }, isoWeek: { $isoWeek: '$completedAt' } } }
          },
          completed: { $sum: 1 }
        }
      },
      { $sort: { '_id.week': 1 } }
    ]);

    // Reshape: { projectName: { week: completed } }
    const result = {};
    velocity.forEach(v => {
      const projectName = v._id.project;
      const weekKey = v._id.week.toISOString().split('T')[0];
      if (!result[projectName]) result[projectName] = [];
      result[projectName].push({ week: weekKey, completed: v.completed });
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('getProjectVelocity error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get platform overview (SuperAdmin only)
 * @route   GET /api/v1/analytics/admin/platform-overview
 */
const getPlatformOverview = async (req, res) => {
  try {
    const [
      userCount, userByRole, workspaceCount, projectCount,
      taskStats, orderStats, totalTokens, activityLast30
    ] = await Promise.all([
      User.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Workspace.countDocuments(),
      Project.countDocuments(),
      Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.aggregate([{ $group: { _id: null, total: { $sum: '$wallet.balance' } } }]),
      Activity.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const usersByRole = {};
    userByRole.forEach(r => { usersByRole[r._id] = r.count; });

    const tasksByStatus = {};
    taskStats.forEach(s => { tasksByStatus[s._id] = s.count; });

    const ordersByStatus = {};
    orderStats.forEach(s => { ordersByStatus[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        users: userCount,
        usersByRole,
        workspaces: workspaceCount,
        projects: projectCount,
        tasksByStatus,
        ordersByStatus,
        totalTokens: totalTokens[0]?.total || 0,
        topActivities: activityLast30
      }
    });
  } catch (error) {
    console.error('getPlatformOverview error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  getWorkspaceOverview,
  getActivityTrends,
  getContractorUtilization,
  getTokenEconomy,
  getJobConversion,
  getProjectVelocity,
  getPlatformOverview
};