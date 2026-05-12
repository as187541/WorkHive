const express = require('express');
const router = express.Router();

const {
  createJobPosting,
  browseJobPostings,
  getJobPostingById,
  getMyJobPostings,
  updateJobPosting,
  deleteJobPosting,
  closeJobPosting,
  getPendingJobs,
  approveJobPosting,
  rejectJobPosting
} = require('../controllers/jobPostingController');

const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/adminMiddleware');

// My job postings (must be before /:id)
router.get('/my/jobs', protect, getMyJobPostings);

// Admin job approval routes
router.get('/admin/pending', protect, authorizeRoles('Admin'), getPendingJobs);
router.patch('/admin/:id/approve', protect, authorizeRoles('Admin'), approveJobPosting);
router.patch('/admin/:id/reject', protect, authorizeRoles('Admin'), rejectJobPosting);

// Browse and create
router.get('/', protect, browseJobPostings);
router.post('/', protect, createJobPosting);

// Single job operations
router.get('/:id', protect, getJobPostingById);
router.patch('/:id', protect, updateJobPosting);
router.delete('/:id', protect, deleteJobPosting);
router.patch('/:id/close', protect, closeJobPosting);

module.exports = router;
