const User = require('../models/User');
const Campus = require('../models/Campus');
const Course = require('../models/Course');
const Batch = require('../models/Batch');

exports.getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCampuses = await Campus.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalBatches = await Batch.countDocuments();

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalCampuses,
        totalCourses,
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
    const totalCampuses = await Campus.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalBatches = await Batch.countDocuments();

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalCampuses,
        totalCourses,
        totalBatches,
        activeStudents: totalUsers,
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

const env = require('../config/env');
const sdmsService = require('../services/sdms.service');

exports.getCampuses = async (req, res) => {
  try {
    if (env.USE_RDS_ORG_DATA) {
      const colleges = await sdmsService.getColleges();
      return res.json({ success: true, source: 'rds', read_only: true, data: colleges });
    }
    const campuses = await Campus.find();
    return res.json({ success: true, data: campuses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCampus = async (req, res) => {
  try {
    const campus = new Campus(req.body);
    await campus.save();
    return res.status(201).json({ success: true, data: campus });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCampus = async (req, res) => {
  try {
    const campus = await Campus.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, data: campus });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCampus = async (req, res) => {
  try {
    await Campus.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Campus deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const { campusId } = req.params;
    const filter = campusId ? { campus_id: campusId } : {};
    const courses = await Course.find(filter).populate('campus_id');
    return res.json({ success: true, data: courses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const courseData = { ...req.body };
    if (req.params.campusId) {
      courseData.campus_id = req.params.campusId;
    }
    const course = new Course(courseData);
    await course.save();
    return res.status(201).json({ success: true, data: course });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
