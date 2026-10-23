const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Result = require('../models/Result');

exports.getCampusDashboard = async (req, res) => {
  try {
    const campusId = req.user.campus_id;
    const filter = campusId ? { campus_id: campusId } : {};

    const totalStudents = await Student.countDocuments(filter);
    const totalBatches = await Batch.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        totalStudents,
        totalBatches,
        campusName: 'Campus Administration',
        activeExams: 0
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCampusReports = async (req, res) => {
  try {
    const campusId = req.user.campus_id;
    const results = await Result.find().limit(50).populate('student_id');
    const averageScore = results.length
      ? Math.round((results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length) * 10) / 10
      : 0;

    return res.json({
      success: true,
      data: {
        results,
        averageScore,
        totalAttempts: results.length
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
