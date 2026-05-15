const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const campaignController = require('../controllers/campaign.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

// Public
router.get('/active', protect, campaignController.getActiveCampaigns);
router.get('/all', protect, campaignController.getAllCampaigns);
router.post('/donate', protect, campaignController.donateToCampaign);

// Admin / NGO Management
router.post('/', protect, restrictTo(...ALLOWED), campaignController.createCampaign);
router.put('/:id', protect, restrictTo(...ALLOWED), campaignController.updateCampaign);

module.exports = router;