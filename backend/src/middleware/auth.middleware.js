const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET_KEY);
    
    // Find user by id or username
    const userId = decoded.id || decoded.sub || decoded.user_id;
    let user;
    if (userId) {
      user = await User.findById(userId);
    }
    if (!user && decoded.username) {
      user = await User.findOne({ username: decoded.username });
    }

    if (!user) {
      // Create lightweight user context from token if DB document is pending sync
      user = {
        _id: decoded.id || decoded.sub,
        id: decoded.id || decoded.sub,
        username: decoded.username || decoded.identity,
        role: decoded.role || 'student',
        campus_id: decoded.campus_id,
        course_id: decoded.course_id,
        batch_id: decoded.batch_id
      };
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', error: err.message });
  }
};

module.exports = authenticateToken;
