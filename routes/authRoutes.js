const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');

const { 
  register, 
  login, 
  getMe, 
  googleLogin,
  requestOTP, 
  updateProfile,
  getUserProfile,
  redeemTokens,
  forgotPassword,
  resetPassword,
  updateTalentProfile,
  getMyTalentStats,
  getWorkspaceBalances
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/request-otp', protect, requestOTP);
router.patch('/update-profile', protect, upload.single('avatar'), updateProfile);
router.get('/user/:id', protect, getUserProfile);
router.post('/redeem', protect, redeemTokens);

// Talent profile routes
router.patch('/update-talent-profile', protect, updateTalentProfile);
router.get('/me/talent-stats', protect, getMyTalentStats);
router.get('/workspace-balances', protect, getWorkspaceBalances);

module.exports = router;