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
router.get("/feed-ad", protect, adController.getFeedAd);
router.post("/track-impression", protect, adController.trackImpression);
router.post("/track-click", protect, adController.trackClick);

// ========== CAMPAIGN ROUTES (Users + Seniors) ==========
router.post("/campaigns", protect, upload.array("media", 5), adController.createCampaign);

// Get campaigns
// - Users → only their campaigns
// - Seniors → all campaigns
router.get("/campaigns", protect, adController.getCampaigns);

// Get single campaign
// - Owner or senior only
router.get("/campaigns/:id", protect, adController.getCampaign);

// Update campaign
// - Owner can update (goes back to pending)
// - Seniors can update directly
router.put("/campaigns/:id", protect, upload.array("media", 5), adController.updateCampaign);

// Delete campaign
// - Owner or senior
router.delete("/campaigns/:id", protect, adController.deleteCampaign);

// Approve / Reject / Change Status (ONLY seniors)
router.patch("/campaigns/:id/status", protect, authorize("SUPER_ADMIN", "ADDITIONAL_DIRECTOR", "STATE_OFFICER", "DISTRICT_MANAGER", "DISTRICT_PRESIDENT"), adController.updateCampaignStatus);

// ========== ANALYTICS ROUTES ==========

// Global analytics
// - Users → their own data
// - Seniors → all data
router.get("/analytics", protect, adController.getAnalytics);

// Single campaign analytics
// - Owner or senior
router.get("/analytics/campaign/:id", protect, adController.getCampaignAnalytics);

module.exports = router;