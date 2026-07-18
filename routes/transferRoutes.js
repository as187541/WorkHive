const express = require('express');
const router = express.Router();

const {
  transferTokens,
  getTransferHistory
} = require('../controllers/transferController');

const { protect } = require('../middleware/authMiddleware');

// Transfer tokens between users
router.post('/', protect, transferTokens);

// Get transfer history
router.get('/history', protect, getTransferHistory);

module.exports = router;
