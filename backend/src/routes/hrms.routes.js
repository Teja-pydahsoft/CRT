const express = require('express');
const router = express.Router();
const hrmsController = require('../controllers/hrms.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.use(authenticateToken);
router.get('/employees', hrmsController.getEmployees);
router.post('/fetch-dynamic', hrmsController.fetchDynamicUser);

module.exports = router;
