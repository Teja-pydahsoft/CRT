const Batch = require('../models/Batch');
const Campus = require('../models/Campus');
const Course = require('../models/Course');
const Student = require('../models/Student');
const User = require('../models/User');
const emailService = require('../services/email.service');
const papaparse = require('papaparse');
const xlsx = require('xlsx');

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
    const campuses = await Campus.find();
    return res.json({ success: true, data: campuses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBatchCourses = async (req, res) => {
  try {
    const campusIds = req.query.campus_ids ? req.query.campus_ids.split(',') : [];
    const filter = campusIds.length ? { campus_id: { $in: campusIds } } : {};
    const courses = await Course.find(filter);
    return res.json({ success: true, data: courses });
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

    return res.json({
      success: true,
      totalCount: parsedStudents.length,
      validStudents: parsedStudents,
      invalidStudents: []
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadStudentsToBatch = async (req, res) => {
  try {
    const { campus_id, batch_id, students } = req.body;
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ success: false, message: 'Students array required' });
    }

    let createdCount = 0;
    for (const item of students) {
      const username = item.roll_number || item.student_id || item.email?.split('@')[0] || `std_${Date.now()}_${Math.floor(Math.random()*1000)}`;
      const password = item.password || 'Student@123';
      const email = item.email || `${username}@student.versant.com`;
      const name = item.name || item.student_name || username;

      let user = await User.findOne({ username });
      if (!user) {
        user = new User({
          username,
          password,
          email,
          name,
          role: 'student',
          campus_id,
          batch_id
        });
        await user.save();
      }

      let student = await Student.findOne({ student_id: username });
      if (!student) {
        student = new Student({
          user_id: user._id,
          student_id: username,
          roll_number: item.roll_number || username,
          email,
          name,
          campus_id,
          batch_id
        });
        await student.save();
        createdCount++;

        // Asynchronously notify via email
        emailService.sendStudentCredentials(email, username, password, 'http://localhost:3000/login');
      }
    }

    if (batch_id) {
      await Batch.findByIdAndUpdate(batch_id, { $inc: { student_count: createdCount } });
    }

    return res.json({
      success: true,
      message: `Successfully processed ${students.length} students. (${createdCount} new accounts created)`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBatchStudents = async (req, res) => {
  try {
    const { batchId } = req.params;
    const students = await Student.find({ batch_id: batchId }).populate('user_id');
    return res.json({
      success: true,
      count: students.length,
      students
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentAccessStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId) || await Student.findOne({ student_id: studentId });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    return res.json({
      success: true,
      data: {
        authorized_levels: student.authorized_levels,
        authorized_modules: student.authorized_modules
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.authorizeStudentLevel = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { level } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (!student.authorized_levels.includes(level)) {
      student.authorized_levels.push(level);
      await student.save();
    }
    return res.json({ success: true, data: student });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.lockStudentLevel = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { level } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    student.authorized_levels = student.authorized_levels.filter(l => l !== level);
    await student.save();
    return res.json({ success: true, data: student });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.authorizeStudentModule = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { module } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (!student.authorized_modules.includes(module)) {
      student.authorized_modules.push(module);
      await student.save();
    }
    return res.json({ success: true, data: student });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.lockStudentModule = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { module } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    student.authorized_modules = student.authorized_modules.filter(m => m !== module);
    await student.save();
    return res.json({ success: true, data: student });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
