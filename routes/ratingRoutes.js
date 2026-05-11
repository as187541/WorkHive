const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
  createRating,
  getUserRatingStats,
  getProjectRatings
} = require('../controllers/ratingController');

// All rating routes require authentication
router.use(protect);

router.post('/', createRating);
router.get('/user/:userId', getUserRatingStats);
router.get('/project/:projectId', getProjectRatings);

module.exports = router;
