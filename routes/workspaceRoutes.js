// routes/workspaceRoutes.js
const express = require('express');
const router = express.Router();

// 1. IMPORT the project router to handle nested routes
const projectRouter = require('./projectRoutes'); 

const { 
  createWorkspace, 
  getWorkspaces, 
  getWorkspaceById, // Restore this
  inviteMember, 
  getMyInvitations, 
  acceptInvitation, 
  removeMember, 
  getWorkspaceMembers,
  deleteOrLeaveWorkspace // Restore this
} = require('../controllers/workspaceController');

const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Global Workspace routes
router.route('/')
  .get(getWorkspaces)
  .post(createWorkspace);

// Invitation routes
router.get('/invitations/me', getMyInvitations);
router.post('/invitations/:inviteId/accept', acceptInvitation);

// 2. MOUNT the project router (This fixes the /projects 404)
router.use('/:workspaceId/projects', projectRouter);

// Workspace Member routes
router.route('/:workspaceId/members')
  .get(getWorkspaceMembers)
  .post(inviteMember);

router.delete('/:workspaceId/members/:userId', removeMember);

// 3. SINGLE Workspace routes (This fixes the /workspaces/:id 404)
router.route('/:workspaceId')
  .get(getWorkspaceById)
  .delete(deleteOrLeaveWorkspace);

module.exports = router;