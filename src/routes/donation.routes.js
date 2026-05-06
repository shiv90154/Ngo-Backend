const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donation.controller');
const { protect, restrictTo } = require('../middleware');

// User routes
router.post('/', protect, donationController.createDonation);
router.get('/my', protect, donationController.getMyDonations);

// Admin routes
router.get('/all', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), donationController.getAllDonations);
router.post('/custom', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), donationController.createCustomDonation);

module.exports = router;