const express = require('express');
const router = express.Router();
const adminManagementController = require('../controllers/adminManagement.controller');
const authenticateToken = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');

router.use(authenticateToken);
router.use(authorizeRoles('superadmin'));

router.get('/list', adminManagementController.listAdmins);
router.post('/create', adminManagementController.createAdmin);
router.delete('/:id', adminManagementController.deleteAdmin);

module.exports = router;
