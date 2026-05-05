const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const fieldDashboardController = require('../controllers/fieldDashboard.controller');

router.get('/stats', protect, fieldDashboardController.getDashboardStats);

module.exports = router;