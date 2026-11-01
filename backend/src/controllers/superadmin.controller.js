const User = require('../models/User');
const Batch = require('../models/Batch');
const sdmsService = require('../services/sdms.service');

exports.getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const [colleges, courses] = await Promise.all([
      sdmsService.getColleges(),
      sdmsService.getCourses()
    ]);
    const totalBatches = await Batch.countDocuments();

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalCampuses: colleges.length,
        totalCourses: courses.length,
        totalBatches,
        systemHealth: '100%'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const [colleges, courses, students] = await Promise.all([
      sdmsService.getColleges(),
      sdmsService.getCourses(),
      sdmsService.getFilteredStudents({ page: 1, limit: 1, includePhoto: false })
    ]);
    const totalBatches = await Batch.countDocuments();

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalCampuses: colleges.length,
        totalCourses: courses.length,
        totalBatches,
        activeStudents: students.pagination.total,
        systemHealth: '100%',
        recentActivities: []
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGlobalFeatures = async (req, res) => {
  const role = req.params.role || req.user?.role || 'superadmin';
  return res.json({
    success: true,
    data: {
      role,
      features: {
        test_taking: { name: 'Test Taking', enabled: true, required: true },
        speaking_evaluation: { name: 'Speaking AI Evaluation', enabled: true, required: true },
        batch_management: { name: 'Batch Management', enabled: true, required: false }
      }
    }
  });
};

exports.getCampuses = async (req, res) => {
  try {
    const colleges = await sdmsService.getColleges();
    return res.json({ success: true, source: 'rds', read_only: true, data: colleges });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCampus = async (req, res) => {
  return res.status(409).json({ success: false, message: 'Campus records are read-only and managed by SDMS.' });
};

exports.updateCampus = async (req, res) => {
  return res.status(409).json({ success: false, message: 'Campus records are read-only and managed by SDMS.' });
};

exports.deleteCampus = async (req, res) => {
  return res.status(409).json({ success: false, message: 'Campus records are read-only and managed by SDMS.' });
};

exports.getCourses = async (req, res) => {
  try {
    const { campusId } = req.params;
    const courses = await sdmsService.getCourses(campusId);
    return res.json({ success: true, source: 'rds', read_only: true, data: courses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCourse = async (req, res) => {
  return res.status(409).json({ success: false, message: 'Course records are read-only and managed by SDMS.' });
};
