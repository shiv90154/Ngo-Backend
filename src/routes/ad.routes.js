// routes/ad.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adController = require('../controllers/ad.controller');
const { protect, restrictTo } = require('../middleware');  // restrictTo is same as authorize
const validate = require('../middleware/validate');
const { body, param } = require('express-validator');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/ads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('केवल इमेज/वीडियो अपलोड करें'), false);
  },
});

// Validators
const createCampaignValidator = [
  body('businessName').notEmpty().withMessage('व्यवसाय का नाम आवश्यक'),
  body('targetUrl').notEmpty().withMessage('टारगेट URL आवश्यक'),
  body('totalBudget').isNumeric().withMessage('कुल बजट संख्या हो'),
  body('bidAmount').isNumeric().withMessage('बिड राशि संख्या हो'),
  body('endDate').notEmpty().withMessage('समाप्ति तिथि आवश्यक'),
];

// User routes
router.get('/feed-ad', protect, adController.getFeedAd);
router.post('/track-impression', protect, adController.trackImpression);
router.post('/track-click', protect, adController.trackClick);

// Admin routes
const adminAuth = [protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR')];

router.post('/campaigns', ...adminAuth, upload.array('media', 5), validate(createCampaignValidator), adController.createCampaign);
router.get('/campaigns', ...adminAuth, adController.getCampaigns);
router.get('/campaigns/:id', ...adminAuth, adController.getCampaign);
router.put('/campaigns/:id', ...adminAuth, upload.array('media', 5), adController.updateCampaign);
router.delete('/campaigns/:id', ...adminAuth, adController.deleteCampaign);
router.patch('/campaigns/:id/status', ...adminAuth, adController.updateCampaignStatus);

// Analytics
router.get('/analytics', ...adminAuth, adController.getAnalytics);
router.get('/analytics/campaign/:campaignId', ...adminAuth, adController.getCampaignAnalytics);

module.exports = router;