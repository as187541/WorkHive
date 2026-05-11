const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
  sendHireInvitation,
  getSentHireInvitations,
  getReceivedHireInvitations,
  acceptHireInvitation,
  rejectHireInvitation,
  completeHire,
  cancelHireInvitation
} = require('../controllers/hireController');

// All hire routes require authentication
router.use(protect);

router.post('/', sendHireInvitation);
router.get('/sent', getSentHireInvitations);
router.get('/received', getReceivedHireInvitations);
router.patch('/:hireId/accept', acceptHireInvitation);
router.patch('/:hireId/reject', rejectHireInvitation);
router.patch('/:hireId/complete', completeHire);
router.delete('/:hireId', cancelHireInvitation);

module.exports = router;
