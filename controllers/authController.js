const { OAuth2Client } = require('google-auth-library');
const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const Project = require('../models/projectModel');
const HireInvitation = require('../models/hireInvitationModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// 1. Register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ msg: 'Server error during registration' });
  }
};

// 2. Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email }).select('+password');
    
    // User not found OR user has no password (Google-only account)
    if (!user || !user.password) {
      return res.status(401).json({ msg: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ msg: 'Server error during login' });
  }
};

// 3. Get Current User
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Find workspaces where user is Admin
    const adminWorkspaces = await Workspace.find({
      'members.user': req.user._id,
      'members.role': 'Admin'
    }).select('_id name');

    // Find projects where user is Lead
    const leadProjects = await Project.find({ lead: req.user._id }).select('_id name');

    const approverScope = {
      isSuperAdmin: user.role === 'SuperAdmin',
      adminWorkspaces: adminWorkspaces.map(w => ({ id: w._id, name: w.name })),
      leadProjects: leadProjects.map(p => ({ id: p._id, name: p.name }))
    };

    res.status(200).json({
      ...user.toObject(),
      approverScope
    });
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// 4. Google Login
const googleLogin = async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = await User.create({ name: payload.name, email: payload.email });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(401).json({ msg: 'Google Sign-In failed.' });
  }
};

const sendEmail = require('../utils/sendEmail');

// --- 1. SEND OTP ---
const requestOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to DB with 10 min expiry
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: 'WorkHive Security Code',
      html: `<h3>Security Verification</h3>
             <p>You requested a password change. Your OTP is:</p>
             <h1 style="color: #4f46e5;">${otp}</h1>
             <p>This code expires in 10 minutes.</p>`
    });

    res.status(200).json({ msg: 'OTP sent to your email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to send OTP.' });
  }
};

// --- 2. UPDATE PROFILE WITH OTP ---
const updateProfile = async (req, res) => {
  try {
     
    const { name, password, otp } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');

    // If changing password, verify OTP first
    if (password) {
      if (!otp || user.otp !== otp || user.otpExpires < Date.now()) {
        return res.status(400).json({ msg: 'Invalid or expired OTP.' });
      }
      
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      
      // Clear OTP
      user.otp = undefined;
      user.otpExpires = undefined;
    }

    if (name) user.name = name;
    if (req.file) {
     
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'workhive_avatars' },
          (error, res) => {
            if (error) reject(error);
            else resolve(res);
          }
        );
        stream.end(req.file.buffer);
      });
      user.avatar = result.secure_url;
      
    }

    await user.save();
    res.status(200).json({ message: 'Profile updated successfully', user });

  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ msg: 'Server error' });
  }
};
const getUserProfile = async (req, res) => {
  try {
    // Only select public info: name, email, role, and joined date
    const user = await User.findById(req.params.id).select('name email role avatar createdAt');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};
const redeemTokens = async (req, res) => {
  try {
    const { cost, rewardTitle } = req.body;
    
    // Find user (req.user._id comes from protect middleware)
    const user = await User.findById(req.user._id);

    // Check balance
    if (user.wallet.balance < cost) {
      return res.status(400).json({ msg: "Insufficient HiveTokens for this reward." });
    }

    // Deduct tokens and log to history
    user.wallet.balance -= cost;
    
    user.wallet.history.push({
      amount: -cost,
      reason: `Redeemed: ${rewardTitle}`,
      date: new Date()
    });

    await user.save();

    // Return new balance so frontend can update user state instantly
    res.status(200).json({ 
      msg: "Redeemed successfully!", 
      newBalance: user.wallet.balance 
    });
  } catch (error) {
    console.error("REDEEM TOKENS ERROR:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// --- FORGOT PASSWORD: Send OTP ---
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ msg: 'Please provide your email address.' });
    }

    const user = await User.findOne({ email });
    
    // Don't reveal if user exists for security
    if (!user) {
      return res.status(200).json({ msg: 'If an account exists, a reset code has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to DB with 10 min expiry
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: 'WorkHive Password Reset',
      html: `<h3>Password Reset Request</h3>
             <p>You requested to reset your password. Your reset code is:</p>
             <h1 style="color: #4f46e5;">${otp}</h1>
             <p>This code expires in 10 minutes.</p>
             <p>If you didn't request this, please ignore this email.</p>`
    });

    res.status(200).json({ msg: 'If an account exists, a reset code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ msg: 'Failed to send reset code.' });
  }
};

// --- RESET PASSWORD: Verify OTP and update ---
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ msg: 'Please provide email, reset code, and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters.' });
    }

    const user = await User.findOne({ email }).select('+password +otp +otpExpires');
    
    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired reset code.' });
    }

    if (user.otp !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ msg: 'Invalid or expired reset code.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ msg: 'Password reset successful! You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ msg: 'Failed to reset password.' });
  }
};

// --- TALENT PROFILE MANAGEMENT ---

/**
 * @desc    Update talent profile fields (bio, skills, portfolio, availability, hourlyRate)
 * @route   PATCH /api/v1/auth/update-talent-profile
 * @access  Private
 */
const updateTalentProfile = async (req, res) => {
  try {
    const { bio, skills, portfolio, availabilityStatus, hourlyRate } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    if (bio !== undefined) user.bio = bio;
    if (skills !== undefined) user.skills = skills;
    if (portfolio !== undefined) user.portfolio = portfolio;
    if (availabilityStatus !== undefined) user.availabilityStatus = availabilityStatus;
    if (hourlyRate !== undefined) user.hourlyRate = hourlyRate;

    await user.save();

    res.status(200).json({
      success: true,
      msg: 'Talent profile updated successfully.',
      data: {
        bio: user.bio,
        skills: user.skills,
        portfolio: user.portfolio,
        availabilityStatus: user.availabilityStatus,
        hourlyRate: user.hourlyRate
      }
    });
  } catch (error) {
    console.error('updateTalentProfile error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get current user's talent stats
 * @route   GET /api/v1/auth/me/talent-stats
 * @access  Private
 */
const getMyTalentStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('ratingAverage totalCompletedProjects availabilityStatus bio skills portfolio hourlyRate');

    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    // Count pending hire invitations
    const pendingHires = await HireInvitation.countDocuments({
      invitedUser: req.user._id,
      status: 'Pending',
      expiresAt: { $gt: new Date() }
    });

    res.status(200).json({
      success: true,
      data: {
        ratingAverage: user.ratingAverage,
        totalCompletedProjects: user.totalCompletedProjects,
        availabilityStatus: user.availabilityStatus,
        bio: user.bio,
        skills: user.skills,
        portfolio: user.portfolio,
        hourlyRate: user.hourlyRate,
        pendingHires
      }
    });
  } catch (error) {
    console.error('getMyTalentStats error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// --- EXPORTS (Update this block) ---
module.exports = {
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
  getMyTalentStats
};
