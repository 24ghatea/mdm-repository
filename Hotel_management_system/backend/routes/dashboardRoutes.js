const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Dashboard metrics and activity
router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;
