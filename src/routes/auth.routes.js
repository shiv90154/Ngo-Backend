// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const userController = require('../controllers/auth.controller');
const { protect, restrictTo, rateLimiter } = require('../middleware');
const {
  registerValidation,
  loginValidation,
  otpValidation,
  resetPasswordValidation,
} = require('../validators/authValidator');

// Multer setup (unchanged)
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

// ====================== PUBLIC ROUTES ======================
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
  registerValidation,
  userController.register
);

router.post('/verify-otp', otpValidation, rateLimiter.otpLimiter, userController.verifyOTP);
router.post('/resend-otp', otpValidation, rateLimiter.otpLimiter, userController.resendOTP);
router.post('/login', loginValidation, rateLimiter.loginLimiter, userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/verify-reset-otp', otpValidation, userController.verifyResetOtp);
router.post('/reset-password', resetPasswordValidation, userController.resetPassword);

// ====================== PROTECTED ROUTES ======================
// Profile
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

// Subordinates – only NGO organizational roles can view subordinates
router.get('/subordinates', protect, userController.getSubordinates);
router.get(
  '/subordinates/:id',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_DEVELOPMENT_COORDINATOR',
             'DISTRICT_BRANCH_MANAGER', 'DISTRICT_PRESIDENT', 'DISTRICT_FIELD_COORDINATOR',
             'BLOCK_DEVELOPMENT_COORDINATOR', 'GRAM_DEVELOPMENT_COORDINATOR'),
  userController.getSubordinates
);

// Wallet (any logged-in user)
router.post('/wallet', protect, userController.updateWallet);

// Health Records – BAMS_DOCTOR included
router.post('/health-records', protect, upload.single('file'), userController.addHealthRecord);
router.post(
  '/health-records/user/:userId',
  protect,
  restrictTo('BAMS_DOCTOR', 'SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  upload.single('file'),
  userController.addHealthRecord
);

// Agriculture Products
router.post('/products', protect, upload.single('image'), userController.addProductListing);

// Contract Farming
router.post('/contract-farming', protect, userController.addContractFarming);

// Loans
router.post('/loans', protect, userController.addLoan);
router.post(
  '/loans/user/:userId',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'FINANCE_SERVICE_CONSULTANCY'),
  userController.addLoan
);

// CRM Clients
router.post('/clients', protect, userController.addClient);

// CRM Projects
router.post('/projects', protect, userController.addProject);

// E-commerce Store Products
router.post('/store-products', protect, upload.single('image'), userController.addStoreProduct);

// AI, MLM, Subscription – only SUPER_ADMIN
router.put('/ai/tokens', protect, restrictTo('SUPER_ADMIN'), userController.updateAITokens);
router.post('/ai/usage', protect, userController.incrementAIUsage);
router.post(
  '/subscription/history',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  userController.addSubscriptionHistory
);
router.put(
  '/mlm/payout',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  userController.updateMLMPayout
);

// Restore user
router.patch(
  '/:id/restore',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  userController.restoreUser
);

// Admin user management
router.get(
  '/',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_DEVELOPMENT_COORDINATOR'),
  userController.getAllUsers
);
router.get(
  '/:id',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_DEVELOPMENT_COORDINATOR'),
  userController.getUserById
);
router.delete(
  '/:id',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  userController.deleteUser
);
router.post(
  '/assign-hierarchy',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_DEVELOPMENT_COORDINATOR',
             'DISTRICT_BRANCH_MANAGER', 'DISTRICT_PRESIDENT'),
  userController.assignReporting
);

module.exports = router;