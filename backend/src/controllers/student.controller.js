const Student = require('../models/Student');
const Test = require('../models/Test');
const Result = require('../models/Result');
const questionBankService = require('../services/questionBank.service');

exports.getStudentTests = async (req, res) => {
  try {
    const { module, category } = req.query;
    const filter = { status: 'active' };
    if (module) filter.module_id = new RegExp(module, 'i');
    if (category) filter.subcategory = new RegExp(category, 'i');

    const tests = await Test.find(filter).sort({ created_at: -1 });
    return res.json({ success: true, data: tests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOnlineExams = async (req, res) => {
  try {
    const tests = await Test.find({ status: 'active' }).sort({ startDateTime: 1, created_at: -1 }).lean();
    return res.json({ success: true, data: tests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCompletedExams = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const completedIds = await Result.distinct('test_id', { user_id: userId, test_id: { $ne: null } });
    return res.json({ success: true, data: completedIds });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.startTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    return res.json({
      success: true,
      message: 'Exam session started',
      data: {
        _id: test._id,
        title: test.title,
        duration: test.duration,
        attempt_id: `att_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        questions: test.questions
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitOnlineExam = async (req, res) => {
  try {
    const testId = req.params.id;
    const { answers } = req.body;
    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    let correctCount = 0;
    const questions = test.questions || [];
    const totalQuestions = questions.length || 1;

    const answersMap = {};
    if (Array.isArray(answers)) {
      answers.forEach(a => {
        if (a && a.question_id !== undefined) answersMap[a.question_id] = a.selected_answer;
        else if (a && a.id !== undefined) answersMap[a.id] = a.answer;
      });
    } else if (typeof answers === 'object' && answers !== null) {
      Object.assign(answersMap, answers);
    }

    questions.forEach((q, idx) => {
      const qKey = q._id || q.id || idx;
      const userAns = answersMap[qKey] !== undefined ? answersMap[qKey] : answersMap[idx];
      const correctAns = q.correct_answer;
      if (userAns !== undefined && correctAns !== undefined && String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase()) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const userId = req.user.id || req.user._id;
    const student = await Student.findOne({ user_id: userId });

    const result = new Result({
      student_id: student ? student._id : userId,
      user_id: userId,
      test_id: test._id,
      module_id: test.module_id,
      score: score,
      percentage: score,
      answers: answers,
      created_at: new Date()
    });
    await result.save();

    return res.json({
      success: true,
      message: 'Exam submitted successfully',
      data: {
        resultId: result._id,
        score,
        percentage: score,
        correctCount,
        totalQuestions
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAutoPracticeQuestions = async (req, res) => {
  try {
    const moduleType = req.query.module || 'crt';
    const topic = req.query.topic || 'aptitude';
    const count = parseInt(req.query.count || 25, 10);
    const result = await questionBankService.getAutoPracticeQuestions(moduleType, topic, count);
    return res.json(result);
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
