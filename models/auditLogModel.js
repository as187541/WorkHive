const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: [
      'USER_DELETE',
      'USER_ROLE_UPDATE',
      'TOKEN_ALTER',
      'WORKSPACE_DELETE',
      'WORKSPACE_CREATE',
      'LOGIN',
      'LOGOUT',
      'ADMIN_LOGIN'
    ],
    required: true,
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetType',
    default: null
  },
  targetType: {
    type: String,
    enum: ['User', 'Workspace', 'Task', 'System'],
    default: 'System'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: 'unknown'
  },
  userAgent: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Compound index for efficient querying
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, targetType: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
