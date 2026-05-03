// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const userController = require('../controllers/auth.controller');
const { protect, restrictTo } = require('../middleware');
// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../../temp_uploads');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// ======================
// PUBLIC ROUTES (No authentication)
// ======================
router.post(
  '/register',
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 },
    { name: 'aadhaarImage', maxCount: 1 },
    { name: 'aadharDocument', maxCount: 1 },
    { name: 'panImage', maxCount: 1 },
    { name: 'panDocument', maxCount: 1 },
    { name: 'storeLogo', maxCount: 1 },
  ]),
  userController.register
);

router.post('/verify-otp', userController.verifyOTP);
router.post('/resend-otp', userController.resendOTP);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/verify-reset-otp', userController.verifyResetOtp);
router.post('/reset-password', userController.resetPassword);

// ======================
// PROTECTED ROUTES (Authentication required)
// ======================
router.get('/profile', protect, userController.getProfile);
router.put(
  '/profile',
  protect,
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 },
    { name: 'storeLogo', maxCount: 1 },

  ]),
  userController.updateProfile
);

// Subordinates - two separate routes (NO OPTIONAL PARAM)
router.get('/subordinates', protect, userController.getSubordinates);
router.get('/subordinates/:id', protect, userController.getSubordinates);

router.post('/wallet', protect, userController.updateWallet);

// Health Records - two separate routes
router.post('/health-records', protect, upload.single('file'), userController.addHealthRecord);
router.post(
  '/health-records/user/:userId',
  protect,
  restrictTo('DOCTOR', 'SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  upload.single('file'),
  userController.addHealthRecord
);

// Agriculture Products
router.post('/products', protect, upload.single('image'), userController.addProductListing);

// Contract Farming
router.post('/contract-farming', protect, userController.addContractFarming);

// Loans - two separate routes
router.post('/loans', protect, userController.addLoan);
router.post(
  '/loans/user/:userId',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  userController.addLoan
);

// CRM Clients
router.post('/clients', protect, userController.addClient);

// CRM Projects
router.post('/projects', protect, userController.addProject);

// E-commerce Store Products
router.post('/store-products', protect, upload.single('image'), userController.addStoreProduct);

// AI, MLM, Subscription
router.put('/ai/tokens', protect, restrictTo('SUPER_ADMIN'), userController.updateAITokens);
router.post('/ai/usage', protect, userController.incrementAIUsage);
router.post('/subscription/history', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), userController.addSubscriptionHistory);
router.put('/mlm/payout', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), userController.updateMLMPayout);

// Restore user
router.patch('/:id/restore', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), userController.restoreUser);

// Admin user management - specific routes BEFORE param routes
router.get('/', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), userController.getAllUsers);
router.get('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_OFFICER'), userController.getUserById);
router.delete('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), userController.deleteUser);
router.post('/assign-hierarchy', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_OFFICER'), userController.assignReporting);

module.exports = router;