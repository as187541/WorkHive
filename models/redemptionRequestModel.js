const mongoose = require('mongoose');

const redemptionRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
    index: true
  },
  rewardTitle: {
    type: String,
    required: true
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Denied'],
    default: 'Pending',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date,
    default: null
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

// Compound indexes for efficient scoped queries
redemptionRequestSchema.index({ status: 1, requestedAt: -1 });
redemptionRequestSchema.index({ user: 1, status: 1 });
redemptionRequestSchema.index({ workspace: 1, status: 1 });
redemptionRequestSchema.index({ project: 1, status: 1 });

module.exports = mongoose.model('RedemptionRequest', redemptionRequestSchema);
