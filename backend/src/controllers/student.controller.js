const Student = require('../models/Student');
const Test = require('../models/Test');
const Result = require('../models/Result');

exports.getStudentTests = async (req, res) => {
  try {
    const tests = await Test.find({ status: 'active' });
    return res.json({ success: true, data: tests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTestDetails = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    return res.json({ success: true, data: test });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUnlockedModules = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const student = await Student.findOne({ user_id: userId });

    const modules = student ? student.authorized_modules : ['listening', 'speaking', 'reading', 'writing', 'grammar', 'vocabulary'];
    const levels = student ? student.authorized_levels : [1];

    return res.json({
      success: true,
      data: {
        unlocked_modules: modules,
        unlocked_levels: levels
      },
      unlocked_modules: modules,
      unlocked_levels: levels
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGrammarProgress = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const results = await Result.find({ user_id: userId, module_id: 'grammar' });
    const averageScore = results.length
      ? Math.round((results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length) * 10) / 10
      : 0;

    return res.json({
      success: true,
      data: {
        completed_topics: results.length,
        average_score: averageScore,
        history: results
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTestResultById = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result not found' });
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
