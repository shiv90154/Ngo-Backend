const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const fieldDashboardController = require('../controllers/fieldDashboard.controller');

router.get('/stats', protect, fieldDashboardController.getDashboardStats);
router.get('/team', protect, fieldDashboardController.getTeam);
router.get('/licenses', protect, fieldDashboardController.getLicenses);
router.get('/commissions', protect, fieldDashboardController.getCommissions);
router.get('/contributions', protect, fieldDashboardController.getContributions);
router.get('/meetings', protect, fieldDashboardController.getMeetings);
module.exports = router;