const express = require('express');
const router = express.Router();

const {
  submitProposal,
  getProposalsForJob,
  getMyProposals,
  acceptProposal,
  rejectProposal,
  withdrawProposal
} = require('../controllers/proposalController');

const { protect } = require('../middleware/authMiddleware');

// Submit proposal for a job
router.post('/jobs/:jobId/proposals', protect, submitProposal);

// Get proposals for a job (job owner only)
router.get('/jobs/:jobId/proposals', protect, getProposalsForJob);

// Get my proposals
router.get('/my', protect, getMyProposals);

// Accept, reject, withdraw
router.patch('/:id/accept', protect, acceptProposal);
router.patch('/:id/reject', protect, rejectProposal);
router.patch('/:id/withdraw', protect, withdrawProposal);

module.exports = router;
