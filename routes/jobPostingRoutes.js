const express = require('express');
const router = express.Router();

const {
  createJobPosting,
  browseJobPostings,
  getJobPostingById,
  getMyJobPostings,
  updateJobPosting,
  deleteJobPosting,
  closeJobPosting
} = require('../controllers/jobPostingController');

const { protect } = require('../middleware/authMiddleware');

// My job postings (must be before /:id)
router.get('/my/jobs', protect, getMyJobPostings);

// Browse and create
router.get('/', protect, browseJobPostings);
router.post('/', protect, createJobPosting);

// Single job operations
router.get('/:id', protect, getJobPostingById);
router.patch('/:id', protect, updateJobPosting);
router.delete('/:id', protect, deleteJobPosting);
router.patch('/:id/close', protect, closeJobPosting);

module.exports = router;
