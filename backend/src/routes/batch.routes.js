const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batch.controller');
const authenticateToken = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');
const requireSdmsAssignment = require('../middleware/sdmsScope.middleware');

router.use(authenticateToken);
const organizationManagers = authorizeRoles('superadmin', 'campus_admin', 'course_admin');

// Campus and Course lookup for batch creation
router.get('/campuses', organizationManagers, requireSdmsAssignment, batchController.getBatchCampuses);
router.get('/courses', organizationManagers, requireSdmsAssignment, batchController.getBatchCourses);

// Student batch CRUD
router.get('/', batchController.getBatches);
router.post('/', authorizeRoles('superadmin', 'campus_admin'), batchController.createBatch);
router.put('/:id', authorizeRoles('superadmin', 'campus_admin'), batchController.updateBatch);
router.delete('/:id', authorizeRoles('superadmin', 'campus_admin'), batchController.deleteBatch);

const sdmsController = require('../controllers/sdms.controller');

// SDMS compatibility endpoints
router.get('/students/filtered/credentials', organizationManagers, requireSdmsAssignment, sdmsController.exportStudentsCsv);
router.get('/students/:studentId/credentials', organizationManagers, requireSdmsAssignment, sdmsController.exportSingleStudentCsv);
router.get('/students/filtered', organizationManagers, requireSdmsAssignment, sdmsController.getStudents);
router.get('/branches', organizationManagers, requireSdmsAssignment, sdmsController.getBranches);

// File validation and upload
router.post('/validate-student-upload', organizationManagers, upload.single('file'), batchController.validateStudentUpload);
router.post('/upload-students', organizationManagers, batchController.uploadStudentsToBatch);

// Batch details and student locking/unlocking
router.get('/batch/:batchId/students', batchController.getBatchStudents);
router.get('/student/:studentId/access-status', batchController.getStudentAccessStatus);
router.post('/student/:studentId/authorize-level', authorizeRoles('superadmin', 'campus_admin', 'course_admin'), batchController.authorizeStudentLevel);
router.post('/student/:studentId/lock-level', authorizeRoles('superadmin', 'campus_admin', 'course_admin'), batchController.lockStudentLevel);
router.post('/student/:studentId/authorize-module', authorizeRoles('superadmin', 'campus_admin', 'course_admin'), batchController.authorizeStudentModule);
router.post('/student/:studentId/lock-module', authorizeRoles('superadmin', 'campus_admin', 'course_admin'), batchController.lockStudentModule);

module.exports = router;
