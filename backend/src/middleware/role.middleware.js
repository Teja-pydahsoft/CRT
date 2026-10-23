const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userRole = req.user.role;
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ 
      success: false, 
      message: `Access forbidden for role: ${userRole}. Required role: ${allowedRoles.join(', ')}` 
    });
  };
};

module.exports = authorizeRoles;
