const express = require('express');
const router = express.Router();
const courseAdminController = require('../controllers/courseAdmin.controller');
const campusAdminController = require('../controllers/campusAdmin.controller');
const authenticateToken = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');
const requireSdmsAssignment = require('../middleware/sdmsScope.middleware');

router.use(authenticateToken);
router.use(authorizeRoles('superadmin', 'campus_admin', 'course_admin'));

router.get('/dashboard', requireSdmsAssignment, courseAdminController.getCourseDashboard);
router.get('/student-progress', requireSdmsAssignment, courseAdminController.getStudentProgress);
router.get('/student-practice-results', requireSdmsAssignment, courseAdminController.getStudentPracticeResults);
router.get('/student-online-results', requireSdmsAssignment, courseAdminController.getStudentOnlineResults);
router.get('/reports', requireSdmsAssignment, campusAdminController.getCampusReports);
router.get('/reports/online-tests', requireSdmsAssignment, campusAdminController.getOnlineTestOverview);
router.get('/reports/online-tests/:testId/attempts', requireSdmsAssignment, campusAdminController.getOnlineTestAttempts);
router.get(
  '/reports/students/:studentId/online-tests/:testId/attempts',
  requireSdmsAssignment,
  campusAdminController.getStudentOnlineTestAttempts
);

module.exports = router;
