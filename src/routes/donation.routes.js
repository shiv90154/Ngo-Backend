const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const donationController = require('../controllers/donation.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

// Public (user) routes – no restrictTo
router.post('/', protect, donationController.createDonation);
router.get('/my', protect, donationController.getMyDonations);

// Admin / NGO Management routes
router.get('/all', protect, restrictTo(...ALLOWED), donationController.getAllDonations);
router.post('/custom', protect, restrictTo(...ALLOWED), donationController.createCustomDonation);

module.exports = router;