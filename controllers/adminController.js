const mongoose = require('mongoose');
const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const Task = require('../models/taskModel');
const AuditLog = require('../models/auditLogModel');
const { logAuditAction } = require('../middleware/auditMiddleware');

/**
 * @desc    Get all users (SuperAdmin only)
 * @route   GET /api/v1/admin/users
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all workspaces with member details (SuperAdmin only)
 * @route   GET /api/v1/admin/workspaces
 */
const getAllWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find()
      .populate('members.user', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: workspaces.length,
      data: workspaces
    });
  } catch (error) {
    console.error('getAllWorkspaces error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Delete a user (SuperAdmin only)
 * @route   DELETE /api/v1/admin/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent SuperAdmin from deleting themselves
    if (id === req.user._id.toString()) {
      return res.status(400).json({ msg: 'You cannot delete your own account.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    await User.findByIdAndDelete(id);

    // Log audit
    await logAuditAction(req, 'USER_DELETE', 'User', id, {
      deletedUserEmail: user.email,
      deletedUserName: user.name
    });

    res.status(200).json({
      success: true,
      msg: 'User deleted successfully.'
    });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Update user role (SuperAdmin only)
 * @route   PATCH /api/v1/admin/users/:id/role
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['User', 'SuperAdmin'].includes(role)) {
      return res.status(400).json({ msg: 'Invalid role. Must be User or SuperAdmin.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    // Log audit
    await logAuditAction(req, 'USER_ROLE_UPDATE', 'User', id, {
      previousRole,
      newRole: role,
      targetUserEmail: user.email
    });

    res.status(200).json({
      success: true,
      msg: `User role updated to ${role}.`,
      data: { id: user._id, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('updateUserRole error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Alter user tokens (SuperAdmin only) — unlimited power
 * @route   POST /api/v1/admin/users/:id/tokens
 */
const alterUserTokens = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason, workspaceId } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ msg: 'Please provide an amount.' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      return res.status(400).json({ msg: 'Amount must be a valid number.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    // If workspaceId provided, validate it and ensure user is a member
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ msg: 'Workspace not found.' });
      }
      const isMember = workspace.members.some(m => m.user.toString() === id);
      if (!isMember) {
        return res.status(400).json({ msg: 'User is not a member of the specified workspace.' });
      }
    }

    const previousBalance = user.wallet?.balance || 0;
    const newBalance = previousBalance + numericAmount;

    // Build history entry
    const historyEntry = {
      amount: numericAmount,
      reason: reason || `Admin adjustment by ${req.user.name}`,
      date: new Date()
    };
    if (workspaceId) {
      historyEntry.workspace = workspaceId;
    }

    // Update global wallet balance and push to history
    await User.findByIdAndUpdate(id, {
      $inc: { 'wallet.balance': numericAmount },
      $push: {
        'wallet.history': historyEntry
      }
    });

    // If workspaceId provided, also credit workspace-specific balance
    if (workspaceId) {
      // Try to increment existing workspace entry
      const incResult = await User.updateOne(
        { _id: id, 'wallet.workspaces.workspace': workspaceId },
        { $inc: { 'wallet.workspaces.$.balance': numericAmount } }
      );

      // If no existing workspace entry, push a new one
      if (incResult.modifiedCount === 0) {
        await User.updateOne(
          { _id: id },
          { $push: { 'wallet.workspaces': { workspace: workspaceId, balance: numericAmount } } }
        );
      }
    }

    // Log audit
    await logAuditAction(req, 'TOKEN_ALTER', 'User', id, {
      previousBalance,
      amount: numericAmount,
      newBalance,
      reason: reason || 'No reason provided',
      targetUserEmail: user.email,
      workspaceId: workspaceId || null
    });

    res.status(200).json({
      success: true,
      msg: `Tokens ${numericAmount >= 0 ? 'added' : 'deducted'} successfully.${workspaceId ? ' Credited to workspace.' : ' Credited to global balance only (not redeemable without a workspace).'}`,
      data: {
        userId: id,
        previousBalance,
        amount: numericAmount,
        newBalance,
        reason,
        workspaceId: workspaceId || null
      }
    });
  } catch (error) {
    console.error('alterUserTokens error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Delete any workspace (SuperAdmin only)
 * @route   DELETE /api/v1/admin/workspaces/:id
 */
const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace not found.' });
    }

    await Workspace.findByIdAndDelete(id);

    // Log audit
    await logAuditAction(req, 'WORKSPACE_DELETE', 'Workspace', id, {
      workspaceName: workspace.name,
      memberCount: workspace.members?.length || 0
    });

    res.status(200).json({
      success: true,
      msg: 'Workspace deleted successfully.'
    });
  } catch (error) {
    console.error('deleteWorkspace error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get platform statistics (SuperAdmin only)
 * @route   GET /api/v1/admin/stats
 */
const getPlatformStats = async (req, res) => {
  try {
    const [userCount, workspaceCount, taskCount, superAdminCount] = await Promise.all([
      User.countDocuments(),
      Workspace.countDocuments(),
      Task.countDocuments(),
      User.countDocuments({ role: 'SuperAdmin' })
    ]);

    // Calculate total tokens in circulation
    const tokenAggregation = await User.aggregate([
      { $group: { _id: null, totalTokens: { $sum: '$wallet.balance' } } }
    ]);
    const totalTokens = tokenAggregation[0]?.totalTokens || 0;

    // Recent audit logs (last 5)
    const recentLogs = await AuditLog.find()
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        users: userCount,
        workspaces: workspaceCount,
        tasks: taskCount,
        superAdmins: superAdminCount,
        totalTokens,
        recentLogs
      }
    });
  } catch (error) {
    console.error('getPlatformStats error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get audit logs with pagination and filters (SuperAdmin only)
 * @route   GET /api/v1/admin/logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, action, adminId, startDate, endDate } = req.query;

    const query = {};
    if (action) query.action = action;
    if (adminId) query.adminId = adminId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('adminId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: logs
    });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get token distribution statistics (SuperAdmin only)
 * @route   GET /api/v1/admin/token-stats
 */
const getTokenStats = async (req, res) => {
  try {
    // Top token holders
    const topHolders = await User.find()
      .select('name email wallet.balance')
      .sort({ 'wallet.balance': -1 })
      .limit(10);

    // Token distribution buckets
    const distribution = await User.aggregate([
      {
        $bucket: {
          groupBy: '$wallet.balance',
          boundaries: [0, 100, 500, 1000, 5000, 10000],
          default: '10000+',
          output: {
            count: { $sum: 1 },
            totalTokens: { $sum: '$wallet.balance' }
          }
        }
      }
    ]);

    // Total tokens and average
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$wallet.balance' },
          averageBalance: { $avg: '$wallet.balance' },
          userCount: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        topHolders,
        distribution,
        overall: stats[0] || { totalTokens: 0, averageBalance: 0, userCount: 0 }
      }
    });
  } catch (error) {
    console.error('getTokenStats error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

const Order = require('../models/orderModel');
const JobPosting = require('../models/jobPostingModel');
const Proposal = require('../models/proposalModel');
const Activity = require('../models/activityModel');
const Project = require('../models/projectModel');

/**
 * @desc    Get platform analytics (SuperAdmin only)
 * @route   GET /api/v1/admin/analytics
 */
const getAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      userCount, usersByRole, workspaceCount, projectCount,
      taskStats, orderStats, totalTokens, activityLast30,
      userGrowth, orderRevenue
    ] = await Promise.all([
      User.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Workspace.countDocuments(),
      Project.countDocuments(),
      Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$price' } } }]),
      User.aggregate([{ $group: { _id: null, total: { $sum: '$wallet.balance' } } }]),
      Activity.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Order.aggregate([
        { $match: { status: 'Accepted', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$price' } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const roleMap = {};
    usersByRole.forEach(r => { roleMap[r._id] = r.count; });

    const tasksByStatus = {};
    taskStats.forEach(s => { tasksByStatus[s._id] = s.count; });

    const ordersByStatus = {};
    let totalOrderValue = 0;
    orderStats.forEach(s => {
      ordersByStatus[s._id] = { count: s.count, value: s.totalValue };
      totalOrderValue += s.totalValue;
    });

    res.status(200).json({
      success: true,
      data: {
        users: userCount,
        usersByRole: roleMap,
        workspaces: workspaceCount,
        projects: projectCount,
        tasksByStatus,
        ordersByStatus,
        totalOrderValue,
        totalTokens: totalTokens[0]?.total || 0,
        topActivities: activityLast30,
        userGrowth,
        orderRevenue
      }
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  getAllUsers,
  getAllWorkspaces,
  deleteUser,
  updateUserRole,
  alterUserTokens,
  deleteWorkspace,
  getPlatformStats,
  getAuditLogs,
  getTokenStats,
  getAnalytics
};
