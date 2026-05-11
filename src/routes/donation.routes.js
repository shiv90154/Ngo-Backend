// backend/src/routes/donation.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const donationController = require('../controllers/donation.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

// ── Any logged‑in user ──
// 1. Offline / cash donation (original)
router.post('/', protect, donationController.createDonation);
router.get('/my', protect, donationController.getMyDonations);

// 2. Online Razorpay donation
router.post('/order', protect, donationController.createDonationOrder);   // Razorpay order create
router.post('/verify', protect, donationController.verifyDonationPayment); // verify & save

// ── NGO / Admin ──
router.get('/all', protect, restrictTo(...ALLOWED), donationController.getAllDonations);
router.post('/custom', protect, restrictTo(...ALLOWED), donationController.createCustomDonation);

module.exports = router;