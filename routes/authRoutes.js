const express = require('express');
const router = express.Router();

// Import all 5 functions
const { 
  register, 
  login, 
  getMe, 
  googleLogin,
  requestOTP, 
  updateProfile 
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

// Define Routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/google', googleLogin);
router.post('/request-otp', protect, requestOTP);
router.patch('/update-profile', protect, updateProfile);

module.exports = router;