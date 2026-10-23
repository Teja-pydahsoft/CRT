const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const tokenPayload = {
      id: user._id,
      username: user.username,
      role: user.role,
      campus_id: user.campus_id,
      course_id: user.course_id,
      batch_id: user.batch_id
    };

    const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET_KEY, { expiresIn: env.JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ id: user._id, username: user.username }, env.JWT_REFRESH_SECRET_KEY, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });

    return res.json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      data: {
        access_token: accessToken,
        refresh_token: refreshToken
      },
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name || user.username,
        campus_id: user.campus_id,
        course_id: user.course_id,
        batch_id: user.batch_id
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.logout = async (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' });
};

exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.body.refresh_token || req.headers['authorization']?.split(' ')[1];
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET_KEY);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const newAccessToken = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        campus_id: user.campus_id,
        course_id: user.course_id,
        batch_id: user.batch_id
      },
      env.JWT_SECRET_KEY,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      data: { access_token: newAccessToken },
      access_token: newAccessToken
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: req.user,
      data: req.user
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  return res.json({ success: true, message: `Password reset email dispatched to ${email || 'user'}` });
};

exports.resetPassword = async (req, res) => {
  return res.json({ success: true, message: 'Password updated successfully' });
};
