const express = require('express');
const router = express.Router();
const subSuperadminController = require('../controllers/subSuperadmin.controller');
const authenticateToken = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');

router.use(authenticateToken);
router.use(authorizeRoles('superadmin'));

router.get('/list', subSuperadminController.listSubSuperadmins);
router.get('/templates', subSuperadminController.getTemplates);
router.get('/available-modules', subSuperadminController.getAvailableModules);
router.post('/create', subSuperadminController.createSubSuperadmin);
router.put('/permissions/:userId', subSuperadminController.updatePermissions);
router.delete('/:userId', subSuperadminController.deleteSubSuperadmin);
router.get('/permissions/:userId', subSuperadminController.getUserPermissions);
router.post('/check-permission', subSuperadminController.checkPermission);

module.exports = router;
