const express = require('express');
const router = express.Router();

const {
  submitProposal,
  getProposalsForJob,
  getMyProposals,
  acceptProposal,
  rejectProposal,
  withdrawProposal,
  // Milestone handlers
  getMilestones,
  submitMilestone,
  approveMilestone,
  rejectMilestone,
  // Counter-offer handlers
  submitCounterOffer,
  acceptCounterOffer,
  rejectCounterOffer
} = require('../controllers/proposalController');

const { protect } = require('../middleware/authMiddleware');

// Submit proposal for a job
router.post('/jobs/:jobId/proposals', protect, submitProposal);

// Get proposals for a job (job owner only)
router.get('/jobs/:jobId/proposals', protect, getProposalsForJob);

// Get my proposals
router.get('/my', protect, getMyProposals);

// Milestone routes
router.get('/:id/milestones', protect, getMilestones);
router.patch('/:id/milestones/:index/submit', protect, submitMilestone);
router.patch('/:id/milestones/:index/approve', protect, approveMilestone);
router.patch('/:id/milestones/:index/reject', protect, rejectMilestone);

// Counter-offer routes
router.post('/:id/counter-offer', protect, submitCounterOffer);
router.patch('/:id/counter-offers/:index/accept', protect, acceptCounterOffer);
router.patch('/:id/counter-offers/:index/reject', protect, rejectCounterOffer);

// Accept, reject, withdraw
router.patch('/:id/accept', protect, acceptProposal);
router.patch('/:id/reject', protect, rejectProposal);
router.patch('/:id/withdraw', protect, withdrawProposal);

module.exports = router;
