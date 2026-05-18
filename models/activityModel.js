const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'task_created',
      'task_updated',
      'task_completed',
      'task_assigned',
      'hire_sent',
      'hire_accepted',
      'hire_rejected',
      'project_created',
      'project_joined',
      'workspace_joined',
      'workspace_created',
      'message_sent',
      'proposal_submitted',
      'proposal_accepted',
      'proposal_rejected',
      'connection_request',
      'connection_accepted',
      'milestone_submitted',
      'milestone_approved',
      'milestone_rejected',
      'counter_offer',
      'counter_offer_accepted',
      'counter_offer_rejected'
    ]
  },
  target: {
    type: String,
    default: ''
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    index: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

activitySchema.index({ createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);