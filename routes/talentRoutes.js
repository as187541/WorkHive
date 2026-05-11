const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
  browseTalent,
  getTalentProfile,
  getUserRatings
} = require('../controllers/talentController');

// All talent routes require authentication
router.use(protect);

router.get('/', browseTalent);
router.get('/:userId', getTalentProfile);
router.get('/:userId/ratings', getUserRatings);

module.exports = router;
