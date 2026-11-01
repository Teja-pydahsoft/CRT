const Result = require('../models/Result');
const Test = require('../models/Test');
const sdmsService = require('../services/sdms.service');

const MAX_STUDENTS = 5000;

const getScope = (req) => ({
  collegeId: req.sdmsScope?.collegeId || null,
  courseId: req.sdmsScope?.courseId || null
});

const getScopedStudents = async (req) => {
  return sdmsService.getAllFilteredStudents({
    ...getScope(req),
    includePhoto: false
  }, MAX_STUDENTS);
};

const getScopedTestFilter = (req) => {
  const scope = getScope(req);
  const filter = { status: 'active' };
  const andConditions = [];
  for (const [field, value] of [
    ['target_college_ids', scope.collegeId],
    ['target_course_ids', scope.courseId]
  ]) {
    if (!value) continue;
    andConditions.push({
      $or: [
        { [field]: value },
        { [field]: { $size: 0 } },
        { [field]: { $exists: false } }
      ]
    });
  }
  if (andConditions.length) filter.$and = andConditions;
  return filter;
};

exports.getCourseDashboard = async (req, res) => {
  try {
    const scope = getScope(req);
    const [students, totalTests] = await Promise.all([
      sdmsService.getFilteredStudents({
        ...scope,
        page: 1,
        limit: 1,
        includePhoto: false
      }),
      Test.countDocuments(getScopedTestFilter(req))
    ]);
    return res.json({
      success: true,
      data: {
        totalStudents: students.pagination.total,
        totalTests,
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
    const result = await sdmsService.getFilteredStudents({
      ...getScope(req),
      page: req.query.page,
      limit: req.query.limit || 50,
      search: req.query.search,
      includePhoto: false
    });
    return res.json({
      success: true,
      source: 'rds',
      read_only: true,
      data: result.students,
      pagination: result.pagination
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getScopedResults = async (req, testType) => {
  const { students, total, truncated } = await getScopedStudents(req);
  const studentById = new Map(students.map((student) => [Number(student.sdms_student_id), student]));
  const studentIds = [...studentById.keys()];
  if (!studentIds.length) return { results: [], truncated };

  const filter = { sdms_student_id: { $in: studentIds } };
  if (testType === 'online_exam') filter.test_type = testType;
  else filter.test_type = { $ne: 'online_exam' };

  const results = await Result.find(filter)
    .sort({ submitted_at: -1 })
    .limit(1000)
    .lean();
  return {
    results: results.map((result) => {
      const student = studentById.get(Number(result.sdms_student_id));
      return {
        ...result,
        student_id: String(result.sdms_student_id),
        student_name: student?.name || 'Student',
        student_email: student?.email || '',
        roll_number: student?.roll_number || '',
        batch_name: student?.batch_name || '',
        module_name: result.module_id,
        score: result.percentage ?? result.score ?? 0
      };
    }),
    truncated: truncated || total > students.length || results.length === 1000
  };
};

exports.getStudentPracticeResults = async (req, res) => {
  try {
    const result = await getScopedResults(req, 'practice');
    return res.json({ success: true, source: 'rds', data: result.results, truncated: result.truncated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentOnlineResults = async (req, res) => {
  try {
    const result = await getScopedResults(req, 'online_exam');
    return res.json({ success: true, source: 'rds', data: result.results, truncated: result.truncated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
