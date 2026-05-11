// backend/src/routes/contract.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, restrictTo } = require('../middleware');
const contractController = require('../controllers/contract.controller');

// Multer for signature upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/signatures')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ─── Admin routes ───
// Create or update contract for a role
router.post(
  '/',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  contractController.createOrUpdateContract
);

// Get all contracts
router.get(
  '/all',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  contractController.getAllContracts
);

// Review/approve user contract
router.patch(
  '/:userId/review',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  contractController.reviewContract
);

// ─── User routes ───
// Get my contract (based on user's role)
router.get('/my', protect, contractController.getMyContract);

// Sign / complete my contract
router.put(
  '/my',
  protect,
  upload.single('signature'),
  contractController.updateMyContract
);

module.exports = router;