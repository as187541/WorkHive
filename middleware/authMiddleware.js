// middleware/authMiddleware.js (Definitive, Bulletproof Version)

const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header, e.g., "Bearer eyJhbGci..." -> "eyJhbGci..."
      token = req.headers.authorization.split(' ')[1];

      // Verify the token is valid
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user from the token's payload and attach them to the request
      // This user object will be available in all subsequent protected routes
      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        // This handles a rare case where the user was deleted after the token was issued
        return res.status(401).json({ msg: 'User not found' });
      }

      // If everything is good, proceed to the next function (the controller)
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ msg: 'Not authorized, token failed' });
    }
  } else {
    // This handles the case where there is no token or it's not a Bearer token
    return res.status(401).json({ msg: 'Not authorized, no token' });
  }
};

module.exports = { protect };