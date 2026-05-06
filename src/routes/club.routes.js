const express = require('express');
const router = express.Router();
const clubController = require('../controllers/club.controller');
const { protect, restrictTo } = require('../middleware');

router.get('/dashboard', protect, restrictTo('CLUB'), clubController.getDashboard);
router.get('/team', protect, restrictTo('CLUB'), clubController.getTeam);
router.get('/licenses', protect, restrictTo('CLUB'), clubController.getLicenseSales);
router.get('/commissions', protect, restrictTo('CLUB'), clubController.getCommissions);

module.exports = router;