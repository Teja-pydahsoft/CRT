const express = require('express');
const router = express.Router();
const superadminController = require('../controllers/superadmin.controller');
const campusAdminController = require('../controllers/campusAdmin.controller');
const authenticateToken = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');

router.use(authenticateToken);
router.use(authorizeRoles('superadmin'));

router.get('/dashboard', superadminController.getDashboard);
router.get('/stats', superadminController.getSystemStats);
router.get('/online-tests-overview', campusAdminController.getOnlineTestOverview);
router.get('/test-attempts/:testId', campusAdminController.getOnlineTestAttempts);
router.get('/student-attempts/:studentId/:testId', campusAdminController.getStudentOnlineTestAttempts);

// Campus management routes (mapped at /superadmin and /campus-management)
router.get('/', superadminController.getCampuses);
router.get('/campuses', superadminController.getCampuses);
router.post('/', superadminController.createCampus);
router.post('/campuses', superadminController.createCampus);
router.put('/campuses/:id', superadminController.updateCampus);
router.put('/:id', superadminController.updateCampus);
router.delete('/campuses/:id', superadminController.deleteCampus);
router.delete('/:id', superadminController.deleteCampus);

// Course management routes
router.get('/courses/:campusId?', superadminController.getCourses);
router.post('/courses/:campusId?', superadminController.createCourse);

module.exports = router;
