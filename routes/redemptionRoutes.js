const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationSchemas');
const {
  createRedemptionSchema,
  redemptionPaginationSchema
} = require('../middleware/validationSchemas');

const {
  createRequest,
  getAllRequests,
  getMyRequests,
  getPendingCount,
  approveRequest,
  denyRequest
} = require('../controllers/redemptionController');

// User routes
router.post('/', protect, validate(createRedemptionSchema), createRequest);
router.get('/my', protect, validate(redemptionPaginationSchema, 'query'), getMyRequests);

// Admin/Approver routes — authorization handled in controllers
router.get('/pending-count', protect, getPendingCount);
router.get('/', protect, validate(redemptionPaginationSchema, 'query'), getAllRequests);
router.patch('/:id/approve', protect, approveRequest);
router.patch('/:id/deny', protect, denyRequest);

module.exports = router;
