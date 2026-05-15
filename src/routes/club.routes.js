const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const clubController = require('../controllers/club.controller');

// All routes require authentication
router.use(protect);

// ─── Club members (any role can view? or only CLUB role) ───
// We'll restrict to CLUB role for now
router.get('/dashboard', restrictTo('CLUB'), clubController.getDashboard);
router.get('/team', restrictTo('CLUB'), clubController.getTeam);
router.get('/licenses', restrictTo('CLUB'), clubController.getLicenses);
router.get('/commissions', restrictTo('CLUB'), clubController.getCommissions);
router.post('/claim-reward', restrictTo('CLUB'), clubController.claimReward);

// Admin can update tier
router.put('/update-tier', restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), clubController.updateMemberTier);

module.exports = router;