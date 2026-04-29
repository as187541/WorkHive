const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

const {
  createRequest,
  getAllRequests,
  getMyRequests,
  getPendingCount,
  approveRequest,
  denyRequest
} = require('../controllers/redemptionController');

// User routes
router.post('/', protect, createRequest);
router.get('/my', protect, getMyRequests);

// Admin/Approver routes — authorization handled in controllers
router.get('/pending-count', protect, getPendingCount);
router.get('/', protect, getAllRequests);
router.patch('/:id/approve', protect, approveRequest);
router.patch('/:id/deny', protect, denyRequest);

module.exports = router;
