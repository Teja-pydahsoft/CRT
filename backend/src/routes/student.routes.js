const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const sdmsController = require('../controllers/sdms.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.use(authenticateToken);

// Student Exam/Module routes
router.get('/tests', studentController.getStudentTests);
router.get('/test/:id', studentController.getTestDetails);
router.get('/unlocked-modules', studentController.getUnlockedModules);
router.get('/grammar-progress', studentController.getGrammarProgress);
router.get('/test-result/:id', studentController.getTestResultById);

// SDMS Hierarchy & Student Fetching
router.get('/sdms/colleges', sdmsController.getColleges);
router.get('/sdms/courses', sdmsController.getCourses);
router.get('/sdms/branches', sdmsController.getBranches);
router.get('/sdms/years', sdmsController.getYears);
router.get('/sdms/semesters', sdmsController.getSemesters);
router.get('/sdms/sections', sdmsController.getSections);
router.get('/sdms/students', sdmsController.getStudents);
router.get('/sdms/export', sdmsController.exportStudentsCsv);

module.exports = router;
