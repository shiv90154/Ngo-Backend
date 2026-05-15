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
router.get('/receipt/:id', protect, async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation || !donation.receiptUrl) {
    return res.status(404).json({ success: false, message: 'Receipt not found' });
  }
  const filePath = path.join(__dirname, '../', donation.receiptUrl);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
  res.download(filePath, `donation_receipt.pdf`);
});
module.exports = router;