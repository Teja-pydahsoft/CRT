const sdmsService = require('../services/sdms.service');

exports.getColleges = async (req, res) => {
  try {
    const colleges = await sdmsService.getColleges();
    return res.json({
      success: true,
      source: 'rds',
      read_only: true,
      data: colleges
    });
  } catch (error) {
    console.error('SDMS getColleges Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const collegeId = req.query.college_id || req.query.campus_id;
    const courses = await sdmsService.getCourses(collegeId);
    return res.json({
      success: true,
      source: 'rds',
      read_only: true,
      data: courses
    });
  } catch (error) {
    console.error('SDMS getCourses Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBranches = async (req, res) => {
  try {
    const collegeId = req.query.college_id || req.query.campus_id;
    const courseId = req.query.course_id;
    const branches = await sdmsService.getBranches(collegeId, courseId);
    return res.json({
      success: true,
      source: 'rds',
      read_only: true,
      data: branches
    });
  } catch (error) {
    console.error('SDMS getBranches Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getYears = async (req, res) => {
  try {
    const collegeId = req.query.college_id || req.query.campus_id;
    const courseId = req.query.course_id;
    const branchId = req.query.branch_id;
    const years = await sdmsService.getYears(collegeId, courseId, branchId);
    return res.json({
      success: true,
      source: 'rds',
      read_only: true,
      data: years
    });
  } catch (error) {
    console.error('SDMS getYears Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSemesters = async (req, res) => {
  try {
    const collegeId = req.query.college_id || req.query.campus_id;
    const courseId = req.query.course_id;
    const branchId = req.query.branch_id;
    const year = req.query.year || req.query.current_year;
    const semesters = await sdmsService.getSemesters(collegeId, courseId, branchId, year);
    return res.json({
      success: true,
      source: 'rds',
      read_only: true,
      data: semesters
    });
  } catch (error) {
    console.error('SDMS getSemesters Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSections = async (req, res) => {
  try {
    const collegeId = req.query.college_id || req.query.campus_id;
    const courseId = req.query.course_id;
    const branchId = req.query.branch_id;
    const year = req.query.year || req.query.current_year;
    const semester = req.query.semester || req.query.current_semester;
    const sections = await sdmsService.getSections(collegeId, courseId, branchId, year, semester);
    return res.json({
      success: true,
      source: 'rds',
      read_only: true,
      data: sections
    });
  } catch (error) {
    console.error('SDMS getSections Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const collegeId = req.query.college_id || req.query.campus_id;
    const courseId = req.query.course_id;
    const branchId = req.query.branch_id;
    const year = req.query.year || req.query.current_year;
    const semester = req.query.semester || req.query.current_semester;
    const section = req.query.section;
    const search = req.query.search;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await sdmsService.getFilteredStudents({
      collegeId,
      courseId,
      branchId,
      year,
      semester,
      section,
      search,
      page,
      limit
    });

    return res.json({
      success: true,
      source: 'rds',
      read_only: true,
      data: result.students,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('SDMS getStudents Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportStudentsCsv = async (req, res) => {
  try {
    const collegeId = req.query.college_id || req.query.campus_id;
    const courseId = req.query.course_id;
    const branchId = req.query.branch_id;
    const year = req.query.year || req.query.current_year;
    const semester = req.query.semester || req.query.current_semester;
    const section = req.query.section;
    const search = req.query.search;

    const result = await sdmsService.getFilteredStudents({
      collegeId,
      courseId,
      branchId,
      year,
      semester,
      section,
      search,
      page: 1,
      limit: 10000,
      includePhoto: false
    });

    const students = result.students || [];
    const headers = ['ID', 'PIN / Roll No', 'Admission No', 'Name', 'Email', 'Mobile', 'College', 'Course', 'Branch', 'Year', 'Semester', 'Section', 'Status'];
    const rows = students.map(s => [
      `"${s.id || ''}"`,
      `"${s.roll_number || s.pin_no || ''}"`,
      `"${s.admission_number || ''}"`,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${s.email || ''}"`,
      `"${s.mobile_number || ''}"`,
      `"${(s.college_name || '').replace(/"/g, '""')}"`,
      `"${(s.course_name || '').replace(/"/g, '""')}"`,
      `"${(s.branch_name || '').replace(/"/g, '""')}"`,
      `"${s.year || ''}"`,
      `"${s.semester || ''}"`,
      `"${s.section || ''}"`,
      `"${s.status || 'active'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sdms_students.csv"');
    return res.send(csvContent);
  } catch (error) {
    console.error('SDMS Export CSV Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportSingleStudentCsv = async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await sdmsService.getFilteredStudents({
      search: studentId,
      page: 1,
      limit: 1
    });

    const student = result.students?.[0] || { id: studentId, name: 'Student', roll_number: studentId };
    const headers = ['ID', 'PIN / Roll No', 'Name', 'Email', 'Mobile', 'College', 'Course', 'Branch', 'Year', 'Semester', 'Section'];
    const row = [
      `"${student.id || ''}"`,
      `"${student.roll_number || ''}"`,
      `"${(student.name || '').replace(/"/g, '""')}"`,
      `"${student.email || ''}"`,
      `"${student.mobile_number || ''}"`,
      `"${(student.college_name || '').replace(/"/g, '""')}"`,
      `"${(student.course_name || '').replace(/"/g, '""')}"`,
      `"${(student.branch_name || '').replace(/"/g, '""')}"`,
      `"${student.year || ''}"`,
      `"${student.semester || ''}"`,
      `"${student.section || ''}"`
    ];

    const csvContent = [headers.join(','), row.join(',')].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${student.roll_number || 'student'}_details.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('SDMS Export Single Student Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get institutional academic validation rules (Colleges, Courses with durations, Branches, Semesters)
 */
exports.getAcademicValidationRules = async (req, res) => {
  try {
    const rules = await sdmsService.getAcademicValidationRules();
    return res.json({
      success: true,
      source: 'rds',
      data: rules
    });
  } catch (error) {
    console.error('SDMS getAcademicValidationRules Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Validate a single student payload against RDS academic rules
 */
exports.validateStudent = async (req, res) => {
  try {
    const studentData = req.body || {};
    const result = await sdmsService.validateStudentData(studentData);
    return res.json({
      success: true,
      isValid: result.isValid,
      errors: result.errors,
      data: result.normalizedData
    });
  } catch (error) {
    console.error('SDMS validateStudent Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk validate student rows
 */
exports.validateStudentsBulk = async (req, res) => {
  try {
    const students = Array.isArray(req.body) ? req.body : (req.body.students || []);
    const result = await sdmsService.validateStudentUpload(students);
    return res.json(result);
  } catch (error) {
    console.error('SDMS validateStudentsBulk Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

