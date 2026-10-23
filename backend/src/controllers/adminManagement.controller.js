const User = require('../models/User');

exports.listAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ['campus_admin', 'course_admin', 'superadmin'] } });
    return res.json({ success: true, data: admins });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Admin deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
