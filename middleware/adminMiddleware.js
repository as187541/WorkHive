const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authorized, no user found' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        msg: `Forbidden: Required role(s): ${roles.join(', ')}` 
      });
    }

    next();
  };
};

module.exports = { authorizeRoles };
