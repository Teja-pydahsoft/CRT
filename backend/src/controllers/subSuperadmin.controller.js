const User = require('../models/User');

exports.listSubSuperadmins = async (req, res) => {
  try {
    const subAdmins = await User.find({ role: 'sub_superadmin' });
    return res.json({ success: true, data: subAdmins });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTemplates = async (req, res) => {
  return res.json({
    success: true,
    data: [
      { id: 'full_admin', name: 'Full Admin Template', permissions: ['manage_users', 'manage_tests', 'analytics'] },
      { id: 'test_creator', name: 'Test Creator Template', permissions: ['manage_tests'] },
      { id: 'view_only', name: 'View Only Template', permissions: ['analytics'] }
    ]
  });
};

exports.getAvailableModules = async (req, res) => {
  return res.json({
    success: true,
    data: [
      { id: 'users', name: 'User Management' },
      { id: 'tests', name: 'Test Management' },
      { id: 'analytics', name: 'Analytics & Reports' },
      { id: 'campuses', name: 'Campus Management' }
    ]
  });
};

exports.createSubSuperadmin = async (req, res) => {
  try {
    const userData = { ...req.body, role: 'sub_superadmin' };
    const user = new User(userData);
    await user.save();
    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePermissions = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { permissions: req.body.permissions }, { new: true });
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSubSuperadmin = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    return res.json({ success: true, message: 'Sub superadmin deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserPermissions = async (req, res) => {
  return res.json({
    success: true,
    data: {
      userId: req.params.userId,
      permissions: ['manage_users', 'manage_tests', 'analytics', 'campuses']
    }
  });
};

exports.checkPermission = async (req, res) => {
  return res.json({
    success: true,
    allowed: true
  });
};
