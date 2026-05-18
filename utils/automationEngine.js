// utils/automationEngine.js
const AutomationRule = require('../models/automationRuleModel');
const User = require('../models/userModel');
const Task = require('../models/taskModel');
const Project = require('../models/projectModel');
const Workspace = require('../models/workspaceModel');
const { emitNotification } = require('./socket');
const sendEmail = require('./sendEmail');
const { logActivity } = require('../controllers/activityController');

/**
 * Evaluate a single condition against the event context.
 * @param {Object} condition - { field, operator, value }
 * @param {Object} context - The event context object
 * @returns {boolean}
 */
function evaluateCondition(condition, context) {
  const { field, operator, value } = condition;
  const contextValue = context[field];

  if (contextValue === undefined) return false;

  switch (operator) {
    case 'eq':
      return String(contextValue) === String(value);
    case 'neq':
      return String(contextValue) !== String(value);
    case 'gt':
      return Number(contextValue) > Number(value);
    case 'lt':
      return Number(contextValue) < Number(value);
    case 'contains':
      return String(contextValue).toLowerCase().includes(String(value).toLowerCase());
    default:
      return false;
  }
}

/**
 * Evaluate all conditions of a rule against the event context.
 * All conditions must match (AND logic).
 * @param {Object} rule - AutomationRule document
 * @param {Object} context - The event context object
 * @returns {boolean}
 */
function evaluateRule(rule, context) {
  if (!rule.conditions || rule.conditions.length === 0) return true; // No conditions = always match
  return rule.conditions.every(condition => evaluateCondition(condition, context));
}

/**
 * Execute a single action.
 * @param {Object} action - { type, config }
 * @param {Object} context - The event context object
 */
async function executeAction(action, context) {
  const { type, config } = action;

  switch (type) {
    case 'send_notification': {
      // Determine target users
      let targetUserIds = [];
      if (config.targetUserId) {
        targetUserIds = [config.targetUserId];
      } else if (config.targetRole === 'Admin') {
        // Find workspace admins
        const workspace = await Workspace.findById(context.workspaceId);
        if (workspace) {
          targetUserIds = workspace.members
            .filter(m => m.role === 'Admin')
            .map(m => m.user.toString());
        }
      } else if (context.userId) {
        targetUserIds = [context.userId];
      }

      targetUserIds.forEach(userId => {
        try {
          emitNotification(userId, {
            type: 'automation',
            title: config.title || 'Automation Notification',
            message: config.message || 'An automation rule was triggered.',
            data: { ruleTrigger: context.triggerType, ...config.data }
          });
        } catch (err) {
          console.error('Automation notification error:', err.message);
        }
      });
      break;
    }

    case 'award_tokens': {
      // Award tokens to a user in the workspace
      const amount = Number(config.amount) || 10;
      let targetUserId = config.userId || context.userId;

      if (!targetUserId) break;

      const updateOps = {
        $inc: { 'wallet.balance': amount },
        $push: {
          'wallet.history': {
            amount,
            reason: config.reason || `Automation reward: ${context.triggerType}`,
            workspace: context.workspaceId,
            date: new Date()
          }
        }
      };

      // Credit workspace-specific balance
      const incResult = await User.updateOne(
        { _id: targetUserId, 'wallet.workspaces.workspace': context.workspaceId },
        { $inc: { 'wallet.workspaces.$.balance': amount } }
      );

      if (incResult.modifiedCount === 0 && context.workspaceId) {
        await User.updateOne(
          { _id: targetUserId },
          { $push: { 'wallet.workspaces': { workspace: context.workspaceId, balance: amount } } }
        );
      }

      await User.findByIdAndUpdate(targetUserId, updateOps);

      // Log activity
      try {
        await logActivity(targetUserId, 'task_completed', `Earned ${amount} HT via automation`, {
          workspace: context.workspaceId,
          project: context.projectId
        });
      } catch (err) {
        console.error('Automation activity log error:', err.message);
      }
      break;
    }

    case 'assign_task': {
      // Reassign a task to a user or role
      if (!context.taskId) break;

      let assignToUserId = config.userId;
      if (config.assignToRole === 'Admin' && context.workspaceId) {
        const workspace = await Workspace.findById(context.workspaceId);
        if (workspace) {
          const admin = workspace.members.find(m => m.role === 'Admin');
          if (admin) assignToUserId = admin.user.toString();
        }
      }

      if (assignToUserId) {
        await Task.findByIdAndUpdate(context.taskId, {
          assignedTo: assignToUserId
        });

        // Notify the assigned user
        try {
          emitNotification(assignToUserId, {
            type: 'task_assigned',
            title: 'Task Assigned by Automation',
            message: `You have been assigned to a task via automation rule.`,
            data: { taskId: context.taskId }
          });
        } catch (err) {
          console.error('Automation assign notification error:', err.message);
        }
      }
      break;
    }

    case 'change_status': {
      // Change the status of an entity
      const { entity, newStatus } = config;
      if (!newStatus) break;

      if (entity === 'task' && context.taskId) {
        await Task.findByIdAndUpdate(context.taskId, { status: newStatus });
      }
      // Can be extended for other entities (proposal, order, etc.)
      break;
    }

    case 'send_email': {
      // Send an email notification
      let emailUserId = config.userId || context.userId;
      if (!emailUserId) break;

      const targetUser = await User.findById(emailUserId);
      if (targetUser) {
        try {
          await sendEmail({
            email: targetUser.email,
            subject: config.subject || 'WorkHive Automation Notification',
            html: config.body || `<p>An automation rule was triggered: ${context.triggerType}</p>`
          });
        } catch (err) {
          console.error('Automation email error:', err.message);
        }
      }
      break;
    }

    case 'create_reminder': {
      // Create an activity log entry as a reminder
      let reminderUserId = config.userId || context.userId;
      if (!reminderUserId) break;

      try {
        await logActivity(reminderUserId, 'task_created', config.message || 'Reminder from automation', {
          workspace: context.workspaceId,
          project: context.projectId,
          metadata: { isReminder: true, triggerType: context.triggerType }
        });
      } catch (err) {
        console.error('Automation reminder error:', err.message);
      }
      break;
    }

    default:
      console.warn(`Unknown automation action type: ${type}`);
  }
}

/**
 * Process a trigger event: find matching rules, evaluate conditions, execute actions.
 * This is the main entry point called from controllers.
 * All errors are caught and logged — never blocks the main response.
 *
 * @param {string} triggerType - One of the trigger enum values
 * @param {Object} context - Event context with workspaceId, userId, etc.
 */
async function processTrigger(triggerType, context) {
  try {
    const rules = await AutomationRule.find({
      workspace: context.workspaceId,
      trigger: triggerType,
      enabled: true
    });

    for (const rule of rules) {
      try {
        const matches = evaluateRule(rule, context);
        if (matches) {
          for (const action of rule.actions) {
            try {
              await executeAction(action, { ...context, triggerType });
            } catch (actionErr) {
              console.error(`Automation action error (rule ${rule._id}, action ${action.type}):`, actionErr.message);
            }
          }
        }
      } catch (ruleErr) {
        console.error(`Automation rule evaluation error (rule ${rule._id}):`, ruleErr.message);
      }
    }
  } catch (err) {
    console.error(`Automation processTrigger error (${triggerType}):`, err.message);
  }
}

module.exports = { evaluateRule, executeAction, processTrigger };