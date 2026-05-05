const express = require('express');
const router = express.Router();
const clubController = require('../controllers/club.controller');
const { protect, authorize } = require('../middleware');

router.get('/dashboard', protect, authorize('CLUB'), clubController.getDashboard);
router.get('/team', protect, authorize('CLUB'), clubController.getTeam);
router.get('/licenses', protect, authorize('CLUB'), clubController.getLicenseSales);
router.get('/commissions', protect, authorize('CLUB'), clubController.getCommissions);

module.exports = router;