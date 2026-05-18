const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/adminMiddleware');

const {
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
} = require('../controllers/adminController');

// Apply authentication and SuperAdmin authorization to ALL routes below
router.use(protect, authorizeRoles('SuperAdmin'));

// ─── User Management ───
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', updateUserRole);
router.post('/users/:id/tokens', alterUserTokens);

// ─── Workspace Management ───
router.get('/workspaces', getAllWorkspaces);
router.delete('/workspaces/:id', deleteWorkspace);

// ─── Platform Stats ───
router.get('/stats', getPlatformStats);

// ─── Audit Logs ───
router.get('/logs', getAuditLogs);

// ─── Token Statistics ───
router.get('/token-stats', getTokenStats);

// ─── Analytics ───
router.get('/analytics', getAnalytics);

module.exports = router;
