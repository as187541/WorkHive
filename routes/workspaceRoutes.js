// routes/workspaceRoutes.js (Updated to use Project Router)
const express = require('express');
const router = express.Router();
const projectRouter = require('./projectRoutes'); // <-- Import the project router

const { createWorkspace, getWorkspaces, getWorkspaceById, inviteMember, getWorkspaceMembers, deleteOrLeaveWorkspace } = require('../controllers/workspaceController.js');
const { protect } = require('../middleware/authMiddleware.js');

router.use(protect);

router.route('/')
  .get(getWorkspaces)
  .post(createWorkspace);
  
// For any route matching /:workspaceId/projects, hand it off to the projectRouter
router.use('/:workspaceId/projects', projectRouter);

router.route('/:workspaceId/members')
  .get(getWorkspaceMembers)
  .post(inviteMember);

router.route('/:workspaceId')
  .get(getWorkspaceById)
  .delete(protect, deleteOrLeaveWorkspace);

module.exports = router;