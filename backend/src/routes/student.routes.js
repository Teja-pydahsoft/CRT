const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const testController = require('../controllers/test.controller');
const sdmsController = require('../controllers/sdms.controller');
const authenticateToken = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authenticateToken);

// Student Exam/Module routes
router.get('/tests', studentController.getStudentTests);
router.get('/test/:id', studentController.getTestDetails);
router.get('/online-exams', studentController.getOnlineExams);
router.get('/completed-exams', studentController.getCompletedExams);
router.post('/tests/:id/start', studentController.startTest);
router.post('/tests/:id/submit', studentController.submitOnlineExam);
router.post('/tests/:id/submit-speaking', upload.any(), testController.submitSpeakingExam);
router.post('/submit-speaking-test', upload.any(), testController.submitSpeakingExam);
router.get('/auto-practice-questions', studentController.getAutoPracticeQuestions);
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
router.get('/sdms/validation-rules', sdmsController.getAcademicValidationRules);
router.post('/sdms/validate-student', sdmsController.validateStudent);
router.post('/sdms/validate-students-bulk', sdmsController.validateStudentsBulk);

module.exports = router;
