const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const { authLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validationSchemas');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema
} = require('../middleware/validationSchemas');

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

// Public routes — with rate limiting and validation
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/google', authLimiter, googleLogin);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/request-otp', protect, requestOTP);
router.patch('/update-profile', protect, upload.single('avatar'), validate(updateProfileSchema), updateProfile);
router.get('/user/:id', protect, getUserProfile);
router.post('/redeem', protect, redeemTokens);

// Talent profile routes
router.patch('/update-talent-profile', protect, updateTalentProfile);
router.get('/me/talent-stats', protect, getMyTalentStats);
router.get('/workspace-balances', protect, getWorkspaceBalances);

module.exports = router;