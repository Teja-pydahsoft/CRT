const express = require('express');
const router = express.Router();
const courseAdminController = require('../controllers/courseAdmin.controller');
const authenticateToken = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');

router.use(authenticateToken);
router.use(authorizeRoles('superadmin', 'campus_admin', 'course_admin'));

router.get('/dashboard', courseAdminController.getCourseDashboard);
router.get('/student-progress', courseAdminController.getStudentProgress);

module.exports = router;
