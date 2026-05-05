const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adController = require('../controllers/ad.controller');
const { protect, authorize } = require('../middleware');

// Configure multer for ad media uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/ads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for ads
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images and videos are allowed for ads'));
        }
    },
});

// ========== USER ROUTES (For displaying ads in feed) ==========
router.get('/feed-ad', protect, adController.getFeedAd);        // Get a single ad for feed insertion
router.post('/track-impression', protect, adController.trackImpression);
router.post('/track-click', protect, adController.trackClick);

// ========== ADMIN ROUTES (For managing ad campaigns) ==========
router.post('/campaigns', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), upload.array('media', 5), adController.createCampaign);
router.get('/campaigns', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), adController.getCampaigns);
router.get('/campaigns/:id', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), adController.getCampaign);
router.put('/campaigns/:id', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), upload.array('media', 5), adController.updateCampaign);
router.delete('/campaigns/:id', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), adController.deleteCampaign);
router.patch('/campaigns/:id/status', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), adController.updateCampaignStatus);

// Analytics
router.get('/analytics', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), adController.getAnalytics);
router.get('/analytics/campaign/:campaignId', protect, authorize('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), adController.getCampaignAnalytics);

module.exports = router;