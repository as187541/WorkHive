const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
// Import all 5 functions
const { 
  register, 
  login, 
  getMe, 
  googleLogin,
  requestOTP, 
  updateProfile,
  getUserProfile 
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

// Define Routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/google', googleLogin);
router.post('/request-otp', protect, requestOTP);
router.patch('/update-profile', protect, upload.single('avatar'), updateProfile);
router.patch('/update-profile', protect, updateProfile);
router.get('/user/:id', protect, getUserProfile);

module.exports = router;