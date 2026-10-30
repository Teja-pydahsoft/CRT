const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagement.controller');
const authenticateToken = require('../middleware/auth.middleware');

// Protect all routes
router.use(authenticateToken);

// Pages & Summary
router.get('/pages', userManagementController.getAvailablePages);
router.get('/summary', userManagementController.getSummary);

// Users Management
router.get('/users', userManagementController.getUsers);
router.post('/users/link-hrms', userManagementController.linkHRMSUser);
router.put('/users/:id', userManagementController.updateUser);
router.delete('/users/:id', userManagementController.deleteUser);

// Roles Management
router.get('/roles', userManagementController.getRoles);
router.post('/roles', userManagementController.createRole);
router.put('/roles/:id', userManagementController.updateRole);
router.delete('/roles/:id', userManagementController.deleteRole);

// HRMS Live Queries
router.get('/hrms/employees', userManagementController.searchHRMSEmployees);
router.get('/hrms/employees/:emp_no', userManagementController.getHRMSEmployee);
router.get('/hrms/departments', userManagementController.getHRMSDepartments);

module.exports = router;

