const Batch = require('../models/Batch');
const papaparse = require('papaparse');
const xlsx = require('xlsx');
const sdmsService = require('../services/sdms.service');

const studentDataMovedMessage = 'Student records are managed by SDMS. This portal does not create or modify student accounts.';

exports.getBatches = async (req, res) => {
  try {
    const batches = await Batch.find().populate('campus_id').populate('course_id');
    return res.json({ success: true, data: batches });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const batch = new Batch(req.body);
    await batch.save();
    return res.status(201).json({ success: true, data: batch });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, data: batch });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    await Batch.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Batch deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBatchCampuses = async (req, res) => {
  try {
    let colleges = await sdmsService.getColleges();
    if (req.sdmsScope?.collegeId) {
      colleges = colleges.filter((college) => Number(college.id) === req.sdmsScope.collegeId);
    } else if (req.sdmsScope?.courseId) {
      const courses = await sdmsService.getCourses();
      const collegeIds = new Set(
        courses
          .filter((course) => Number(course.id) === req.sdmsScope.courseId)
          .map((course) => Number(course.college_id))
      );
      colleges = colleges.filter((college) => collegeIds.has(Number(college.id)));
    }
    return res.json({ success: true, source: 'rds', read_only: true, data: colleges });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBatchCourses = async (req, res) => {
  try {
    const campusIds = req.query.campus_ids ? req.query.campus_ids.split(',') : [];
    const collegeId = req.sdmsScope?.collegeId || campusIds[0];
    let courses = await sdmsService.getCourses(collegeId);
    if (req.sdmsScope?.courseId) {
      courses = courses.filter((course) => Number(course.id) === req.sdmsScope.courseId);
    }
    return res.json({ success: true, source: 'rds', read_only: true, data: courses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.validateStudentUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let parsedStudents = [];
    const buffer = req.file.buffer;

    if (req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      parsedStudents = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      const csvText = buffer.toString('utf-8');
      const results = papaparse.parse(csvText, { header: true, skipEmptyLines: true });
      parsedStudents = results.data;
    }

    // Validate students against actual SDMS College, Course, Branch, Year, and Semester
    const validationResult = await sdmsService.validateStudentUpload(parsedStudents);

    return res.json({
      success: true,
      totalCount: validationResult.totalCount,
      validCount: validationResult.validCount,
      invalidCount: validationResult.invalidCount,
      validStudents: validationResult.validStudents,
      invalidStudents: validationResult.invalidStudents
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadStudentsToBatch = async (req, res) => {
  return res.status(410).json({ success: false, message: studentDataMovedMessage });
};

exports.getBatchStudents = async (req, res) => {
  return res.status(410).json({ success: false, message: studentDataMovedMessage });
};

exports.getStudentAccessStatus = async (req, res) => {
  return res.status(410).json({ success: false, message: studentDataMovedMessage });
};

exports.authorizeStudentLevel = async (req, res) => {
  return res.status(410).json({ success: false, message: studentDataMovedMessage });
};

exports.lockStudentLevel = async (req, res) => {
  return res.status(410).json({ success: false, message: studentDataMovedMessage });
};

exports.authorizeStudentModule = async (req, res) => {
  return res.status(410).json({ success: false, message: studentDataMovedMessage });
};

exports.lockStudentModule = async (req, res) => {
  return res.status(410).json({ success: false, message: studentDataMovedMessage });
};
