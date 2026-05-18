// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/adminMiddleware');
const {
  getWorkspaceOverview,
  getActivityTrends,
  getContractorUtilization,
  getTokenEconomy,
  getJobConversion,
  getProjectVelocity,
  getPlatformOverview
} = require('../controllers/analyticsController');

// All analytics routes require authentication
router.use(protect);

// Workspace-scoped analytics (accessible by workspace members)
router.get('/workspace/:workspaceId/overview', getWorkspaceOverview);
router.get('/workspace/:workspaceId/activity-trends', getActivityTrends);
router.get('/workspace/:workspaceId/contractor-utilization', getContractorUtilization);
router.get('/workspace/:workspaceId/token-economy', getTokenEconomy);
router.get('/workspace/:workspaceId/job-conversion', getJobConversion);
router.get('/workspace/:workspaceId/project-velocity', getProjectVelocity);

// Platform-wide analytics (SuperAdmin only)
router.get('/admin/platform-overview', authorizeRoles('SuperAdmin'), getPlatformOverview);

module.exports = router;