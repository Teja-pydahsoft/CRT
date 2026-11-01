const express = require('express');
const router = express.Router();
const campusAdminController = require('../controllers/campusAdmin.controller');
const authenticateToken = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');

router.use(authenticateToken);
router.use(authorizeRoles('superadmin', 'campus_admin'));

router.get('/dashboard', campusAdminController.getCampusDashboard);
router.get('/reports', campusAdminController.getCampusReports);
router.get('/reports/online-tests', campusAdminController.getOnlineTestOverview);
router.get('/reports/online-tests/:testId/attempts', campusAdminController.getOnlineTestAttempts);
router.get('/reports/students/:studentId/online-tests/:testId/attempts', campusAdminController.getStudentOnlineTestAttempts);

module.exports = router;
