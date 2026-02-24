const { OAuth2Client } = require('google-auth-library');
const User = require('../models/userModel');
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
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ msg: 'Server error during registration' });
  }
};

// 2. Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ msg: 'Server error during login' });
  }
};

// 3. Get Current User
const getMe = async (req, res) => {
  res.status(200).json(req.user);
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

// --- EXPORTS (Update this block) ---
module.exports = {
  register,
  login,
  getMe,
  googleLogin,
  requestOTP,
  updateProfile,
  getUserProfile
};
