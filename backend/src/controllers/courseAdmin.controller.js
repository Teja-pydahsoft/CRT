const Student = require('../models/Student');
const Result = require('../models/Result');

exports.getCourseDashboard = async (req, res) => {
  try {
    const courseId = req.user.course_id;
    const totalStudents = await Student.countDocuments(courseId ? { course_id: courseId } : {});
    return res.json({
      success: true,
      data: {
        totalStudents,
        activeModules: ['listening', 'speaking', 'reading', 'writing'],
        avgProgress: 0
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentProgress = async (req, res) => {
  try {
    const students = await Student.find().limit(50);
    return res.json({
      success: true,
      data: students
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
