const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { getActivities, getWorkspaceActivities } = require('../controllers/activityController');

router.use(protect);

router.get('/', getActivities);
router.get('/workspace/:workspaceId', getWorkspaceActivities);

module.exports = router;