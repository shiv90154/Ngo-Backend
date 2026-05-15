const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userController = require('../controllers/auth.controller');
const { protect, restrictTo } = require('../middleware');

// ---------- Multer Configuration ----------
const tempDir = path.join(__dirname, '../../temp_uploads');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|pdf/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('Only images and PDF files are allowed'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

// ---------- PUBLIC ROUTES ----------
router.post('/register',
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 },
    { name: 'aadhaarImage', maxCount: 1 },
    { name: 'aadharDocument', maxCount: 1 },
    { name: 'panImage', maxCount: 1 },
    { name: 'panDocument', maxCount: 1 },
    { name: 'storeLogo', maxCount: 1 }
  ]),
  userController.register
);

router.post('/verify-otp', userController.verifyOTP);
router.post('/resend-otp', userController.resendOTP);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/verify-reset-otp', userController.verifyResetOtp);
router.post('/reset-password', userController.resetPassword);

// ---------- PROTECTED ROUTES ----------
router.get('/profile', protect, userController.getProfile);
router.put('/profile',
  protect,
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 },
    { name: 'storeLogo', maxCount: 1 }
  ]),
  userController.updateProfile
);

router.get('/subordinates', protect, userController.getSubordinates);
router.get('/subordinates/:id', protect, userController.getSubordinates);
router.post('/wallet', protect, userController.updateWallet);

router.post('/health-records', protect, upload.single('file'), userController.addHealthRecord);
router.post('/health-records/user/:userId',
  protect,
  restrictTo('DOCTOR', 'SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  upload.single('file'),
  userController.addHealthRecord
);

router.post('/products', protect, upload.single('image'), userController.addProductListing);
router.post('/contract-farming', protect, userController.addContractFarming);
router.post('/loans', protect, userController.addLoan);
router.post('/loans/user/:userId',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  userController.addLoan
);
router.post('/clients', protect, userController.addClient);
router.post('/projects', protect, userController.addProject);
router.post('/store-products', protect, upload.single('image'), userController.addStoreProduct);

router.put('/ai/tokens', protect, restrictTo('SUPER_ADMIN'), userController.updateAITokens);
router.post('/ai/usage', protect, userController.incrementAIUsage);
router.post('/subscription/history', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), userController.addSubscriptionHistory);
router.put('/mlm/payout', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), userController.updateMLMPayout);
router.patch('/:id/restore', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), userController.restoreUser);

// Admin user management (specific before generic)
router.get('/', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), userController.getAllUsers);
router.get('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_OFFICER'), userController.getUserById);
router.delete('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), userController.deleteUser);
router.post('/assign-hierarchy', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_OFFICER'), userController.assignReporting);

module.exports = router;