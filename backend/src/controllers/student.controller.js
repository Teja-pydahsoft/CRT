const Student = require('../models/Student');
const Test = require('../models/Test');
const Result = require('../models/Result');
const ExamAttempt = require('../models/ExamAttempt');
const questionBankService = require('../services/questionBank.service');
const { toStudentTest } = require('../services/studentTestView.service');

const getUserId = (req) => req.user.auth_source === 'sdms' ? null : (req.user.id || req.user._id);
const getStudentIdentityFilter = (req) => req.user.auth_source === 'sdms'
  ? { sdms_student_id: req.user.sdms_student_id }
  : { user_id: getUserId(req) };
const getStudentIdentityFields = getStudentIdentityFilter;

const isAssignedToStudent = async (test, req) => {
  const targetColleges = test.target_college_ids || [];
  const targetCourses = test.target_course_ids || [];
  const targetBranches = test.target_branch_ids || [];
  const targetYears = test.target_years || [];
  const targetSemesters = test.target_semesters || [];
  const targetSections = test.target_sections || [];

  if (req.user.auth_source === 'sdms') {
    const matchesNumber = (targets, actual) => (
      !targets.length || (actual !== null && actual !== undefined && targets.includes(Number(actual)))
    );
    if (
      !matchesNumber(targetColleges, req.user.college_id) ||
      !matchesNumber(targetCourses, req.user.course_id) ||
      !matchesNumber(targetBranches, req.user.branch_id) ||
      !matchesNumber(targetYears, req.user.year) ||
      !matchesNumber(targetSemesters, req.user.semester) ||
      (targetSections.length && !targetSections.includes(String(req.user.section || '').trim()))
    ) return false;
  } else if (targetColleges.length || targetCourses.length || targetBranches.length ||
    targetYears.length || targetSemesters.length || targetSections.length) {
    const student = await Student.findOne({ user_id: getUserId(req) });
    const actualValues = [
      [targetColleges, student?.college_id],
      [targetCourses, student?.course_id],
      [targetBranches, student?.branch_id],
      [targetYears, student?.year],
      [targetSemesters, student?.semester]
    ];
    if (actualValues.some(([targets, actual]) => (
      targets.length && (actual === undefined || !targets.includes(Number(actual)))
    ))) return false;
    if (targetSections.length && !targetSections.includes(String(student?.section || '').trim())) return false;
  }

  const targetsCampus = (test.target_campus_ids || []).map(String);
  const targetsBatch = (test.target_batch_ids || []).map(String);
  if (!targetsCampus.length && !targetsBatch.length) return true;

  const student = req.user.auth_source === 'sdms'
    ? null
    : await Student.findOne({ user_id: getUserId(req) });
  const campusId = String(student?.campus_id || req.user.campus_id || '');
  const batchId = String(student?.batch_id || req.user.batch_id || '');
  return (
    (!targetsCampus.length || targetsCampus.includes(campusId)) &&
    (!targetsBatch.length || targetsBatch.includes(batchId))
  );
};

exports.getStudentTests = async (req, res) => {
  try {
    const { module, category } = req.query;
    const filter = { status: 'active' };
    if (module) filter.module_id = new RegExp(module, 'i');
    if (category) filter.subcategory = new RegExp(category, 'i');

    const tests = await Test.find(filter).sort({ created_at: -1 });
    const assignedTests = [];
    for (const test of tests) {
      if (await isAssignedToStudent(test, req)) assignedTests.push(toStudentTest(test));
    }
    return res.json({ success: true, data: assignedTests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOnlineExams = async (req, res) => {
  try {
    const tests = await Test.find({ status: 'active', test_type: 'online_exam' })
      .sort({ startDateTime: 1, created_at: -1 })
      .lean();
    const assignedTests = [];
    for (const test of tests) {
      if (await isAssignedToStudent(test, req)) assignedTests.push(toStudentTest(test));
    }
    return res.json({ success: true, data: assignedTests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCompletedExams = async (req, res) => {
  try {
    const completedIds = await Result.distinct('test_id', {
      ...getStudentIdentityFilter(req),
      test_id: { $ne: null }
    });
    return res.json({ success: true, data: completedIds });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.startTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    if (test.status !== 'active') {
      return res.status(409).json({ success: false, message: 'This test is not active.' });
    }
    if (!(await isAssignedToStudent(test, req))) {
      return res.status(403).json({ success: false, message: 'This test is not assigned to your campus or batch.' });
    }

    const now = new Date();
    if (test.startDateTime && now < new Date(test.startDateTime)) {
      return res.status(409).json({ success: false, message: 'This test is not open yet.' });
    }
    if (test.endDateTime && now > new Date(test.endDateTime)) {
      return res.status(409).json({ success: false, message: 'This test has closed.' });
    }

    const ownerFilter = getStudentIdentityFilter(req);
    if (await Result.exists({ ...ownerFilter, test_id: test._id })) {
      return res.status(409).json({ success: false, message: 'This test has already been completed.' });
    }

    let attempt = await ExamAttempt.findOne({ ...ownerFilter, test_id: test._id });
    if (attempt?.status === 'submitted' || attempt?.status === 'submitting') {
      return res.status(409).json({ success: false, message: 'This test has already been submitted.' });
    }

    if (!attempt) {
      const durationMs = Math.max(Number(test.duration) || 30, 1) * 60 * 1000;
      attempt = new ExamAttempt({
        ...getStudentIdentityFields(req),
        test_id: test._id,
        started_at: now,
        expires_at: new Date(now.getTime() + durationMs + 120000)
      });
      try {
        await attempt.save();
      } catch (error) {
        if (error.code !== 11000) throw error;
        attempt = await ExamAttempt.findOne({ ...ownerFilter, test_id: test._id });
        if (!attempt || attempt.status !== 'in_progress') {
          return res.status(409).json({ success: false, message: 'This test has already been submitted.' });
        }
      }
    }
    if (new Date(attempt.expires_at) < now) {
      return res.status(409).json({ success: false, message: 'This exam attempt has expired.' });
    }

    return res.json({
      success: true,
      message: 'Exam session started',
      data: {
        _id: test._id,
        title: test.title,
        duration: test.duration,
        attempt_id: String(attempt._id),
        started_at: attempt.started_at,
        expires_at: attempt.expires_at,
        questions: toStudentTest(test).questions
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitOnlineExam = async (req, res) => {
  let claimedAttempt = null;
  try {
    const testId = req.params.id;
    const { answers, attempt_id: attemptId, time_taken_ms: timeTakenMs } = req.body;
    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    if (!(await isAssignedToStudent(test, req))) {
      return res.status(403).json({ success: false, message: 'This test is not assigned to your campus or batch.' });
    }

    const ownerFilter = getStudentIdentityFilter(req);
    claimedAttempt = await ExamAttempt.findOneAndUpdate(
      {
        _id: attemptId,
        ...ownerFilter,
        test_id: test._id,
        status: 'in_progress',
        expires_at: { $gte: new Date() }
      },
      { $set: { status: 'submitting' } },
      { new: true }
    );
    if (!claimedAttempt) {
      return res.status(409).json({
        success: false,
        message: 'The exam attempt is missing, expired, or already submitted.'
      });
    }

    let correctCount = 0;
    const questions = test.questions || [];
    const totalQuestions = questions.length;
    if (!totalQuestions) {
      await ExamAttempt.updateOne({ _id: claimedAttempt._id, status: 'submitting' }, { $set: { status: 'in_progress' } });
      claimedAttempt = null;
      return res.status(400).json({ success: false, message: 'This test has no questions to grade.' });
    }

    const answersMap = {};
    if (Array.isArray(answers)) {
      answers.forEach(a => {
        if (a && a.question_id !== undefined) answersMap[a.question_id] = a.selected_answer;
        else if (a && a.id !== undefined) answersMap[a.id] = a.answer;
      });
    } else if (typeof answers === 'object' && answers !== null) {
      Object.assign(answersMap, answers);
    }

    const detailedResults = questions.map((q, idx) => {
      const qKey = q.question_id ?? q._id ?? q.id ?? idx;
      const userAns = answersMap[qKey] !== undefined ? answersMap[qKey] : answersMap[idx];
      const correctAns = q.correct_answer;
      const isCorrect = userAns !== undefined && correctAns !== undefined &&
        String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
      if (isCorrect) correctCount++;
      return {
        question_id: String(qKey),
        question_text: q.question_text || q.text || q.question || '',
        question_type: q.question_type || 'mcq',
        student_answer: userAns === undefined ? '' : String(userAns),
        correct_answer: correctAns === undefined ? '' : String(correctAns),
        correct_answer_text: correctAns === undefined ? '' : String(correctAns),
        is_correct: isCorrect,
        marks_obtained: isCorrect ? 1 : 0,
        max_marks: 1
      };
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const userId = getUserId(req);
    const student = userId ? await Student.findOne({ user_id: userId }) : null;

    const result = new Result({
      student_id: student ? student._id : (userId || null),
      user_id: userId || null,
      sdms_student_id: req.user.auth_source === 'sdms' ? req.user.sdms_student_id : null,
      test_id: test._id,
      module_id: test.module_id,
      test_name: test.title,
      test_type: test.test_type,
      duration: test.duration,
      time_taken_ms: Number.isFinite(Number(timeTakenMs)) ? Math.max(0, Number(timeTakenMs)) : 0,
      score: score,
      percentage: score,
      correct_answers: correctCount,
      total_questions: totalQuestions,
      answers: detailedResults,
      submitted_at: new Date()
    });
    await result.save();
    await ExamAttempt.updateOne(
      { _id: claimedAttempt._id, status: 'submitting' },
      { $set: { status: 'submitted', result_id: result._id } }
    );
    claimedAttempt = null;

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
    if (claimedAttempt) {
      await ExamAttempt.updateOne(
        { _id: claimedAttempt._id, status: 'submitting' },
        { $set: { status: 'in_progress' } }
      );
    }
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
    if (test.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }
    if (!(await isAssignedToStudent(test, req))) {
      return res.status(403).json({ success: false, message: 'This test is not assigned to your campus or batch.' });
    }
    return res.json({ success: true, data: toStudentTest(test) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUnlockedModules = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const student = req.user.auth_source === 'sdms' ? null : await Student.findOne({ user_id: userId });

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
    const results = await Result.find({ ...getStudentIdentityFilter(req), module_id: 'grammar' });
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
    const result = await Result.findOne({ _id: req.params.id, ...getStudentIdentityFilter(req) }).lean();
    if (!result) return res.status(404).json({ success: false, message: 'Result not found' });
    const test = result.test_id ? await Test.findById(result.test_id).select('title duration test_type').lean() : null;
    return res.json({
      success: true,
      data: {
        ...result,
        test_name: result.test_name || test?.title || String(result.module_id || 'Test'),
        duration: result.duration || test?.duration,
        score_percentage: result.percentage ?? result.score ?? 0,
        average_score: result.percentage ?? result.score ?? 0,
        detailed_results: Array.isArray(result.answers) ? result.answers : []
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTestHistory = async (req, res) => {
  try {
    const results = await Result.find(getStudentIdentityFilter(req))
      .sort({ submitted_at: -1, _id: -1 })
      .limit(500)
      .lean();
    const testIds = [...new Set(results.map((result) => result.test_id).filter(Boolean).map(String))];
    const tests = testIds.length ? await Test.find({ _id: { $in: testIds } }).select('title test_type module_id').lean() : [];
    const testsById = new Map(tests.map((test) => [String(test._id), test]));
    const groups = new Map();

    for (const result of results) {
      const test = result.test_id ? testsById.get(String(result.test_id)) : null;
      const groupId = String(result.test_id || result.module_id || 'practice');
      if (!groups.has(groupId)) {
        groups.set(groupId, {
          test_id: groupId,
          test_name: result.test_name || test?.title || result.module_id || 'Practice',
          module_name: result.module_id || test?.module_id || 'Test',
          test_type: (result.test_type || test?.test_type) === 'online_exam' ? 'online' : 'practice',
          attempts: []
        });
      }

      const detailedResults = Array.isArray(result.answers) ? result.answers : [];
      const correctAnswers = result.correct_answers ?? detailedResults.filter((answer) => answer.is_correct).length;
      groups.get(groupId).attempts.push({
        ...result,
        test_id: groupId,
        test_name: result.test_name || test?.title || result.module_id || 'Practice',
        correct_answers: correctAnswers,
        total_questions: result.total_questions || detailedResults.length,
        score_percentage: result.percentage ?? result.score ?? 0,
        detailed_results: detailedResults
      });
    }

    const data = [...groups.values()].map((group) => {
      const latestAttempt = group.attempts[0];
      return {
        ...group,
        attempt_count: group.attempts.length,
        latest_submitted_at: latestAttempt?.submitted_at,
        latest_correct_answers: latestAttempt?.correct_answers || 0,
        total_questions: latestAttempt?.total_questions || 0
      };
    });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
