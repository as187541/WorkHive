const mongoose = require('mongoose');

const ID_PARAMS = ['id', 'workspaceId', 'projectId', 'userId', 'taskId',
  'jobId', 'connectionId', 'inviteId', 'hireId',
  'servicePackageId', 'proposalId', 'recipientId'];

/**
 * Middleware that validates MongoDB ObjectId parameters.
 * Returns 400 if any ID param is present but not a valid ObjectId.
 */
const validateObjectId = (req, res, next) => {
  for (const key of ID_PARAMS) {
    if (req.params[key] && !mongoose.Types.ObjectId.isValid(req.params[key])) {
      return res.status(400).json({
        msg: `Invalid ${key}: must be a valid 24-character hex string`
      });
    }
  }
  next();
};

module.exports = { validateObjectId };
