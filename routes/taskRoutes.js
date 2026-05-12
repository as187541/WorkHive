const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { getMyTasks } = require('../controllers/taskController');

// All task routes require authentication
router.use(protect);

// Get all tasks for the current user
router.get('/my', getMyTasks);

module.exports = router;