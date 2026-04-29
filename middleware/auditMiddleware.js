const AuditLog = require('../models/auditLogModel');

/**
 * Logs an admin action to the audit log collection.
 * @param {Object} req - Express request object (to get user, IP, userAgent)
 * @param {string} action - One of the allowed AuditLog actions
 * @param {string} targetType - 'User', 'Workspace', 'Task', or 'System'
 * @param {string|null} targetId - MongoDB ObjectId of the target
 * @param {Object} details - Additional context (e.g., { previousRole, newRole })
 */
const logAuditAction = async (req, action, targetType = 'System', targetId = null, details = {}) => {
  try {
    await AuditLog.create({
      adminId: req.user._id,
      action,
      targetType,
      targetId,
      details,
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || ''
    });
  } catch (error) {
    console.error('Audit log failed:', error.message);
    // Don't throw — audit logging should never break the main flow
  }
};

module.exports = { logAuditAction };
