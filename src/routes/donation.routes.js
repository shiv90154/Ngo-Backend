const express = require('express');
const router = express.Router();
const {
  createDonation,
  getMyDonations,
  getDonationById,
  getAllDonations,
  verifyDonation,
  rejectDonation,
  acknowledgeDonation,
  paymentCallback,
  downloadReceipt
} = require('../controllers/donationController');

// Auth middleware (apna according adjust karo)
const { protect, authorize } = require('../middleware/auth.middleware.js');

// Multer upload setup (ye maan lo aapne configure kar liya hai)
const upload = require('../middleware/upload'); // multer ya cloudinary middleware

// ═══════════ DONOR ROUTES ═══════════
router.post('/', protect, upload.single('paymentProofImage'), createDonation);
router.get('/my', protect, getMyDonations);
router.get('/:id', protect, getDonationById);
router.get('/:id/receipt', protect, downloadReceipt);

// ═══════════ PAYMENT GATEWAY CALLBACK (agar use karna ho) ═══════════
router.post('/payment-callback', paymentCallback); // sign verify kar lena production mein

// ═══════════ ADMIN ONLY ROUTES ═══════════
router.get('/admin/all', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), getAllDonations);
router.put('/:id/verify', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), verifyDonation);
router.put('/:id/reject', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), rejectDonation);
router.put('/:id/acknowledge', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), acknowledgeDonation);

module.exports = router;