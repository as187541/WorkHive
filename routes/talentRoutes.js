const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
  browseTalent,
  getTalentProfile,
  getUserRatings,
  getRecommendations
} = require('../controllers/talentController');
const {
  createSavedSearch,
  getSavedSearches,
  deleteSavedSearch
} = require('../controllers/savedSearchController');

// All talent routes require authentication
router.use(protect);

router.get('/', browseTalent);
router.get('/recommendations', getRecommendations);

// Saved searches
router.post('/saved-searches', createSavedSearch);
router.get('/saved-searches', getSavedSearches);
router.delete('/saved-searches/:id', deleteSavedSearch);

router.get('/:userId', getTalentProfile);
router.get('/:userId/ratings', getUserRatings);

module.exports = router;
