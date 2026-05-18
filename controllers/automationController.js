// controllers/automationController.js
const AutomationRule = require('../models/automationRuleModel');
const Workspace = require('../models/workspaceModel');

/**
 * @desc    Create a new automation rule
 * @route   POST /api/v1/automations
 * @access  Private (workspace Admin only)
 */
const createRule = async (req, res) => {
  try {
    const { name, description, workspace: workspaceId, trigger, conditions, actions } = req.body;

    if (!name || !workspaceId || !trigger) {
      return res.status(400).json({ msg: 'Please provide name, workspace, and trigger.' });
    }

    if (!actions || actions.length === 0) {
      return res.status(400).json({ msg: 'At least one action is required.' });
    }

    // Verify workspace membership and admin role
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace not found.' });
    }

    const memberRecord = workspace.members.find(m => m.user.equals(req.user._id));
    if (!memberRecord) {
      return res.status(403).json({ msg: 'You are not a member of this workspace.' });
    }
    if (memberRecord.role !== 'Admin') {
      return res.status(403).json({ msg: 'Only workspace Admins can create automation rules.' });
    }

    const rule = await AutomationRule.create({
      name,
      description: description || '',
      workspace: workspaceId,
      trigger,
      conditions: conditions || [],
      actions,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    console.error('createRule error:', error);
    res.status(500).json({ msg: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Get automation rules for a workspace
 * @route   GET /api/v1/automations/workspace/:workspaceId
 * @access  Private (workspace members)
 */
const getWorkspaceRules = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Verify membership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace not found.' });
    }

    const memberRecord = workspace.members.find(m => m.user.equals(req.user._id));
    if (!memberRecord) {
      return res.status(403).json({ msg: 'You are not a member of this workspace.' });
    }

    const rules = await AutomationRule.find({ workspace: workspaceId })
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    console.error('getWorkspaceRules error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Update an automation rule
 * @route   PATCH /api/v1/automations/:id
 * @access  Private (creator or workspace Admin)
 */
const updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, trigger, conditions, actions, enabled } = req.body;

    const rule = await AutomationRule.findById(id);
    if (!rule) {
      return res.status(404).json({ msg: 'Automation rule not found.' });
    }

    // Verify user is creator or workspace admin
    const workspace = await Workspace.findById(rule.workspace);
    const memberRecord = workspace?.members.find(m => m.user.equals(req.user._id));
    const isCreator = rule.createdBy.equals(req.user._id);
    const isAdmin = memberRecord?.role === 'Admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ msg: 'You can only edit rules you created or that belong to workspaces you admin.' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (trigger !== undefined) updates.trigger = trigger;
    if (conditions !== undefined) updates.conditions = conditions;
    if (actions !== undefined) updates.actions = actions;
    if (enabled !== undefined) updates.enabled = enabled;

    const updatedRule = await AutomationRule.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate('createdBy', 'name email avatar');

    res.status(200).json({ success: true, data: updatedRule });
  } catch (error) {
    console.error('updateRule error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Delete an automation rule
 * @route   DELETE /api/v1/automations/:id
 * @access  Private (creator or workspace Admin)
 */
const deleteRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await AutomationRule.findById(id);
    if (!rule) {
      return res.status(404).json({ msg: 'Automation rule not found.' });
    }

    // Verify user is creator or workspace admin
    const workspace = await Workspace.findById(rule.workspace);
    const memberRecord = workspace?.members.find(m => m.user.equals(req.user._id));
    const isCreator = rule.createdBy.equals(req.user._id);
    const isAdmin = memberRecord?.role === 'Admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ msg: 'You can only delete rules you created or that belong to workspaces you admin.' });
    }

    await AutomationRule.findByIdAndDelete(id);

    res.status(200).json({ success: true, msg: 'Automation rule deleted.' });
  } catch (error) {
    console.error('deleteRule error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Toggle an automation rule on/off
 * @route   PATCH /api/v1/automations/:id/toggle
 * @access  Private (creator or workspace Admin)
 */
const toggleRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await AutomationRule.findById(id);
    if (!rule) {
      return res.status(404).json({ msg: 'Automation rule not found.' });
    }

    // Verify user is creator or workspace admin
    const workspace = await Workspace.findById(rule.workspace);
    const memberRecord = workspace?.members.find(m => m.user.equals(req.user._id));
    const isCreator = rule.createdBy.equals(req.user._id);
    const isAdmin = memberRecord?.role === 'Admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ msg: 'You can only toggle rules you created or that belong to workspaces you admin.' });
    }

    rule.enabled = !rule.enabled;
    await rule.save();

    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    console.error('toggleRule error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get pre-built automation templates
 * @route   GET /api/v1/automations/templates
 * @access  Private
 */
const getTemplates = async (req, res) => {
  try {
    const templates = [
      {
        name: 'Early Completion Reward',
        description: 'Award bonus tokens when a task is completed before its due date.',
        trigger: 'task_completed',
        conditions: [
          { field: 'completedEarly', operator: 'eq', value: 'true' }
        ],
        actions: [
          { type: 'award_tokens', config: { amount: 20, reason: 'Early completion bonus' } },
          { type: 'send_notification', config: { title: 'Bonus Earned!', message: 'You earned bonus tokens for completing a task early!', targetRole: 'self' } }
        ]
      },
      {
        name: 'Proposal Notification',
        description: 'Notify workspace admins when a new proposal is submitted.',
        trigger: 'proposal_submitted',
        conditions: [],
        actions: [
          { type: 'send_notification', config: { title: 'New Proposal', message: 'A new proposal has been submitted in your workspace.', targetRole: 'Admin' } }
        ]
      },
      {
        name: 'Redemption Auto-Approve',
        description: 'Automatically approve redemption requests below a cost threshold.',
        trigger: 'redemption_requested',
        conditions: [
          { field: 'cost', operator: 'lt', value: 50 }
        ],
        actions: [
          { type: 'change_status', config: { entity: 'redemption', newStatus: 'Approved' } },
          { type: 'send_notification', config: { title: 'Redemption Auto-Approved', message: 'Your redemption request has been automatically approved.' } }
        ]
      },
      {
        name: 'Overdue Task Alert',
        description: 'Notify project leads when a task becomes overdue.',
        trigger: 'task_overdue',
        conditions: [],
        actions: [
          { type: 'send_notification', config: { title: 'Task Overdue', message: 'A task in your project is overdue.', targetRole: 'Admin' } },
          { type: 'send_email', config: { subject: 'Overdue Task Alert', body: '<p>A task in your workspace is overdue. Please review and take action.</p>' } }
        ]
      }
    ];

    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    console.error('getTemplates error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  createRule,
  getWorkspaceRules,
  updateRule,
  deleteRule,
  toggleRule,
  getTemplates
};