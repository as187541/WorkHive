const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  field: { type: String, required: true }, // e.g., 'priority', 'cost', 'dueDate'
  operator: {
    type: String,
    enum: ['eq', 'neq', 'gt', 'lt', 'contains'],
    required: true
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true } // can be string, number, etc.
}, { _id: false });

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['send_notification', 'award_tokens', 'assign_task', 'change_status', 'send_email', 'create_reminder'],
    required: true
  },
  config: { type: mongoose.Schema.Types.Mixed, default: {} }
  // e.g., for award_tokens: { amount: 20 }
  // e.g., for send_notification: { message: 'Task completed early!', targetRole: 'Admin' }
  // e.g., for change_status: { entity: 'task', newStatus: 'Done' }
  // e.g., for send_email: { subject: '...', body: '...' }
  // e.g., for create_reminder: { message: '...', delayHours: 48 }
  // e.g., for assign_task: { assignToRole: 'Admin' }
}, { _id: false });

const automationRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a rule name'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace is required'],
    index: true
  },
  trigger: {
    type: String,
    enum: [
      'task_completed',
      'task_overdue',
      'proposal_submitted',
      'proposal_accepted',
      'hire_accepted',
      'redemption_requested',
      'order_delivered'
    ],
    required: [true, 'Trigger type is required'],
    index: true
  },
  conditions: [conditionSchema],
  actions: [actionSchema],
  enabled: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Compound index for efficient trigger lookups
automationRuleSchema.index({ workspace: 1, trigger: 1, enabled: 1 });

module.exports = mongoose.model('AutomationRule', automationRuleSchema);