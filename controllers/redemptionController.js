const RedemptionRequest = require('../models/redemptionRequestModel');
const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const Project = require('../models/projectModel');
const { logAuditAction } = require('../middleware/auditMiddleware');
const { emitRedemptionNotification, emitNotification } = require('../utils/socket');
const { processTrigger } = require('../utils/automationEngine');

// Helper: Build scope query for approvers
const buildScopeQuery = async (userId, userRole) => {
  if (userRole === 'SuperAdmin') {
    return {}; // No filter — sees everything
  }

  // Find workspaces where user is Admin
  const adminWorkspaces = await Workspace.find({
    'members.user': userId,
    'members.role': 'Admin'
  }).select('_id');

  // Find projects where user is Lead
  const leadProjects = await Project.find({ lead: userId }).select('_id');

  const workspaceIds = adminWorkspaces.map(w => w._id.toString());
  const projectIds = leadProjects.map(p => p._id.toString());

  const orConditions = [];
  if (workspaceIds.length > 0) {
    orConditions.push({ workspace: { $in: workspaceIds } });
  }
  if (projectIds.length > 0) {
    orConditions.push({ project: { $in: projectIds } });
  }

  if (orConditions.length === 0) {
    return { _id: null }; // Return impossible query — user has no scope
  }

  return { $or: orConditions };
};

// Helper: Check if user can approve/deny a specific request
const canManageRequest = async (request, userId, userRole) => {
  if (userRole === 'SuperAdmin') return true;

  // Check workspace admin
  const isWorkspaceAdmin = await Workspace.exists({
    _id: request.workspace,
    'members.user': userId,
    'members.role': 'Admin'
  });
  if (isWorkspaceAdmin) return true;

  // Check project lead
  if (request.project) {
    const isProjectLead = await Project.exists({
      _id: request.project,
      lead: userId
    });
    if (isProjectLead) return true;
  }

  return false;
};

/**
 * @desc    Create a redemption request (User)
 * @route   POST /api/v1/redemptions
 */
const createRequest = async (req, res) => {
  try {
    const { rewardTitle, cost, workspaceId, projectId } = req.body;

    if (!rewardTitle || cost === undefined || !workspaceId) {
      return res.status(400).json({ msg: 'Please provide rewardTitle, cost, and workspaceId.' });
    }

    // Verify user is a member of the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace not found.' });
    }

    const isMember = workspace.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ msg: 'You must be a member of this workspace to request rewards.' });
    }

    // If projectId provided, verify user is a member of that project
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ msg: 'Project not found.' });
      }
      if (project.workspace.toString() !== workspaceId) {
        return res.status(400).json({ msg: 'Project does not belong to this workspace.' });
      }
      const isProjectMember = project.members.some(m => m.toString() === req.user._id.toString()) || 
                               project.lead.toString() === req.user._id.toString();
      if (!isProjectMember) {
        return res.status(403).json({ msg: 'You must be a member of this project to request rewards.' });
      }
    }

    const user = await User.findById(req.user._id);

    // Ensure wallet exists
    if (!user.wallet) {
      user.wallet = { balance: 0, workspaces: [], history: [] };
    }

    // Check workspace-specific balance
    const workspaceBalance = (user.wallet.workspaces || []).find(
      w => w.workspace.toString() === workspaceId
    );
    const availableBalance = workspaceBalance ? workspaceBalance.balance : 0;

    if (availableBalance < cost) {
      return res.status(400).json({
        msg: `Insufficient HiveTokens in this workspace. You have ${availableBalance} HT in this workspace, but need ${cost} HT.`,
        workspaceBalance: availableBalance,
        totalBalance: user.wallet.balance
      });
    }

    // Check for existing pending request for same reward in same workspace/project
    const existingQuery = {
      user: req.user._id,
      rewardTitle,
      workspace: workspaceId,
      status: 'Pending'
    };
    if (projectId) existingQuery.project = projectId;

    const existing = await RedemptionRequest.findOne(existingQuery);
    if (existing) {
      return res.status(400).json({ msg: 'You already have a pending request for this reward.' });
    }

    const request = await RedemptionRequest.create({
      user: req.user._id,
      workspace: workspaceId,
      project: projectId || null,
      rewardTitle,
      cost
    });

    // Notify workspace admins about new redemption request
    try {
      const adminWorkspaces = await Workspace.findById(workspaceId).populate('members.user', '_id');
      if (adminWorkspaces) {
        adminWorkspaces.members
          .filter(m => m.role === 'Admin' && m.user)
          .forEach(m => {
            emitRedemptionNotification(m.user._id.toString(), {
              type: 'new_redemption',
              title: 'New Redemption Request',
              message: `${req.user.name} requested ${rewardTitle} (${cost} tokens)`,
              data: { requestId: request._id, workspaceId, cost }
            });
          });
      }
    } catch (notifyErr) {
      console.error('Redemption notification error:', notifyErr.message);
    }

    // Automation trigger: redemption requested
    processTrigger('redemption_requested', {
      workspaceId,
      projectId: projectId || null,
      requestId: request._id.toString(),
      cost,
      userId: req.user._id.toString()
    });

    res.status(201).json({
      success: true,
      msg: 'Redemption request submitted! An admin will review it shortly.',
      data: request
    });
  } catch (error) {
    console.error('createRequest error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all redemption requests (Scoped by approver role)
 * @route   GET /api/v1/redemptions
 */
const getAllRequests = async (req, res) => {
  try {
    const { status = 'Pending', page = 1, limit = 20 } = req.query;

    const scopeQuery = await buildScopeQuery(req.user._id, req.user.role);
    const query = { ...scopeQuery };
    if (status !== 'All') query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      RedemptionRequest.find(query)
        .populate('user', 'name email avatar')
        .populate('workspace', 'name')
        .populate('project', 'name')
        .populate('processedBy', 'name')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      RedemptionRequest.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: requests
    });
  } catch (error) {
    console.error('getAllRequests error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get my redemption requests (Current user)
 * @route   GET /api/v1/redemptions/my
 */
const getMyRequests = async (req, res) => {
  try {
    const requests = await RedemptionRequest.find({ user: req.user._id })
      .populate('workspace', 'name')
      .populate('project', 'name')
      .sort({ requestedAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('getMyRequests error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get pending count (for notification badge)
 * @route   GET /api/v1/redemptions/pending-count
 */
const getPendingCount = async (req, res) => {
  try {
    const scopeQuery = await buildScopeQuery(req.user._id, req.user.role);
    const count = await RedemptionRequest.countDocuments({ ...scopeQuery, status: 'Pending' });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('getPendingCount error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Approve a redemption request
 * @route   PATCH /api/v1/redemptions/:id/approve
 */
const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await RedemptionRequest.findById(id).populate('user');
    if (!request) {
      return res.status(404).json({ msg: 'Request not found.' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ msg: `Request is already ${request.status}.` });
    }

    // Authorization check
    const canManage = await canManageRequest(request, req.user._id, req.user.role);
    if (!canManage) {
      return res.status(403).json({ msg: 'You are not authorized to approve this request.' });
    }

    // Self-approval check: user cannot approve their own request
    if (request.user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ msg: 'You cannot approve your own redemption request.' });
    }

    // Check user still has enough workspace-specific balance
    const user = await User.findById(request.user._id);

    // Ensure wallet exists
    if (!user.wallet) {
      user.wallet = { balance: 0, workspaces: [], history: [] };
    }

    const workspaceId = request.workspace.toString();
    const workspaceBalance = (user.wallet.workspaces || []).find(
      w => w.workspace.toString() === workspaceId
    );
    const availableBalance = workspaceBalance ? workspaceBalance.balance : 0;

    if (availableBalance < request.cost) {
      request.status = 'Denied';
      request.processedAt = new Date();
      request.processedBy = req.user._id;
      await request.save();
      return res.status(400).json({ msg: `User no longer has sufficient balance in this workspace (${availableBalance} HT available). Request auto-denied.` });
    }

    // Deduct tokens from workspace-specific balance
    user.wallet.balance -= request.cost;
    if (workspaceBalance) {
      workspaceBalance.balance -= request.cost;
    }
    user.wallet.history.push({
      amount: -request.cost,
      reason: `Redeemed: ${request.rewardTitle}`,
      workspace: request.workspace,
      date: new Date()
    });
    await user.save();

    // Update request
    request.status = 'Approved';
    request.processedAt = new Date();
    request.processedBy = req.user._id;
    await request.save();

    // Notify user that their request was approved
    emitNotification(request.user._id.toString(), {
      type: 'redemption_approved',
      title: 'Redemption Approved',
      message: `Your request for "${request.rewardTitle}" was approved! ${request.cost} tokens deducted.`,
      data: { requestId: request._id, rewardTitle: request.rewardTitle, cost: request.cost }
    });

    // Log audit
    await logAuditAction(req, 'TOKEN_ALTER', 'User', user._id, {
      action: 'Redemption Approved',
      rewardTitle: request.rewardTitle,
      cost: request.cost,
      previousBalance: user.wallet.balance + request.cost,
      newBalance: user.wallet.balance
    });

    res.status(200).json({
      success: true,
      msg: 'Request approved and tokens deducted.',
      data: request
    });
  } catch (error) {
    console.error('approveRequest error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Deny a redemption request
 * @route   PATCH /api/v1/redemptions/:id/deny
 */
const denyRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await RedemptionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ msg: 'Request not found.' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ msg: `Request is already ${request.status}.` });
    }

    // Authorization check
    const canManage = await canManageRequest(request, req.user._id, req.user.role);
    if (!canManage) {
      return res.status(403).json({ msg: 'You are not authorized to deny this request.' });
    }

    // Self-approval check: user cannot deny their own request
    if (request.user.toString() === req.user._id.toString()) {
      return res.status(403).json({ msg: 'You cannot deny your own redemption request.' });
    }

    request.status = 'Denied';
    request.processedAt = new Date();
    request.processedBy = req.user._id;
    await request.save();

    // Notify user that their request was denied
    emitNotification(request.user.toString(), {
      type: 'redemption_denied',
      title: 'Redemption Denied',
      message: `Your request for "${request.rewardTitle}" was denied.`,
      data: { requestId: request._id, rewardTitle: request.rewardTitle }
    });

    res.status(200).json({
      success: true,
      msg: 'Request denied.',
      data: request
    });
  } catch (error) {
    console.error('denyRequest error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  createRequest,
  getAllRequests,
  getMyRequests,
  getPendingCount,
  approveRequest,
  denyRequest
};
