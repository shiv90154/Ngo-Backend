const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaign.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Public
router.get('/active', campaignController.getActiveCampaigns);

// User
router.post('/donate', campaignController.donateToCampaign);

// Admin
router.post('/', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), campaignController.createCampaign);
router.put('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), campaignController.updateCampaign);
router.get('/all', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), campaignController.getAllCampaigns);

module.exports = router;