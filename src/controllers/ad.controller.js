const AdCampaign = require('../models/AdCampaign');
const AdEvent = require('../models/AdEvent');
const User = require('../models/user.model');
const path = require('path');
const fs = require('fs');
const mediaController = require('./media.controller'); // Import to use shared helper

// @desc    Get a single ad for feed insertion (uses shared helper)
// @route   GET /api/ads/feed-ad
// @access  Private
exports.getFeedAd = async (req, res) => {
    try {
        const ad = await mediaController._getAdForFeed(
            req.user.id,
            req.user.role,
            req.user.state,
            req.user.district,
            req.user.block
        );

        if (!ad) {
            return res.json({ success: true, ad: null, message: 'No eligible ads' });
        }

        const adResponse = mediaController._transformAdToPost(ad);
        res.json({ success: true, ad: adResponse });
    } catch (error) {
        console.error('Get feed ad error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Track ad click
// @route   POST /api/ads/track-click
// @access  Private
exports.trackClick = async (req, res) => {
    try {
        const { campaignId, adId } = req.body;
        const actualCampaignId = campaignId || adId;

        const campaign = await AdCampaign.findById(actualCampaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        campaign.clicks += 1;
        campaign.spentBudget += campaign.bidAmount;
        await campaign.save();

        await AdEvent.create({
            campaignId: actualCampaignId,
            userId: req.user.id,
            eventType: 'click',
            metadata: {
                userLocation: { state: req.user.state, district: req.user.district },
                userRole: req.user.role,
            }
        });

        await User.findByIdAndUpdate(req.user.id, {
            $push: { adsSeen: { campaignId: actualCampaignId, clicked: true, clickedAt: new Date() } }
        });

        res.json({ success: true, message: 'Click tracked' });
    } catch (error) {
        console.error('Track click error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Track ad impression (for manual tracking)
// @route   POST /api/ads/track-impression
// @access  Private
exports.trackImpression = async (req, res) => {
    try {
        const { campaignId } = req.body;

        await AdEvent.create({
            campaignId,
            userId: req.user.id,
            eventType: 'impression',
            metadata: {
                userLocation: { state: req.user.state, district: req.user.district },
                userRole: req.user.role,
            }
        });

        await AdCampaign.findByIdAndUpdate(campaignId, { $inc: { impressions: 1 } });
        res.json({ success: true, message: 'Impression tracked' });
    } catch (error) {
        console.error('Track impression error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ========== ADMIN CONTROLLERS ==========
exports.createCampaign = async (req, res) => {
    try {
        const {
            businessName,
            content,
            ctaText,
            targetUrl,
            totalBudget,
            bidAmount,
            targetAudience,
            startDate,
            endDate,
        } = req.body;

        const media = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
                media.push({
                    type: fileType,
                    url: `/uploads/ads/${file.filename}`,
                    thumbnail: fileType === 'video' ? `/uploads/ads/thumb_${file.filename}.jpg` : null,
                });
            }
        }

        const campaign = await AdCampaign.create({
            advertiserId: req.user.id,
            businessName,
            content,
            media,
            ctaText: ctaText || 'Learn More',
            targetUrl,
            totalBudget: parseFloat(totalBudget),
            bidAmount: parseFloat(bidAmount),
            targetAudience: typeof targetAudience === 'string' ? JSON.parse(targetAudience) : targetAudience,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            createdBy: req.user.id,
        });

        res.status(201).json({ success: true, data: campaign });
    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCampaigns = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = { isDeleted: false };
        if (status) query.status = status;

        const campaigns = await AdCampaign.find(query)
            .populate('advertiserId', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await AdCampaign.countDocuments(query);
        res.json({ success: true, data: campaigns, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getCampaign = async (req, res) => {
    try {
        const campaign = await AdCampaign.findById(req.params.id)
            .populate('advertiserId', 'fullName email')
            .populate('createdBy', 'fullName')
            .populate('approvedBy', 'fullName');

        if (!campaign || campaign.isDeleted) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }
        res.json({ success: true, data: campaign });
    } catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const campaign = await AdCampaign.findById(req.params.id);
        if (!campaign || campaign.isDeleted) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const updates = req.body;
        if (req.files && req.files.length > 0) {
            const media = [];
            for (const file of req.files) {
                const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
                media.push({ type: fileType, url: `/uploads/ads/${file.filename}` });
            }
            updates.media = media;
        }

        if (updates.targetAudience && typeof updates.targetAudience === 'string') {
            updates.targetAudience = JSON.parse(updates.targetAudience);
        }

        const updated = await AdCampaign.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update campaign error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        await AdCampaign.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date(), status: 'completed' });
        res.json({ success: true, message: 'Campaign deleted' });
    } catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateCampaignStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const updateData = { status };
        if (status === 'active') {
            updateData.approvedBy = req.user.id;
            updateData.approvedAt = new Date();
        }
        const campaign = await AdCampaign.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: campaign });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const totalCampaigns = await AdCampaign.countDocuments({ isDeleted: false });
        const activeCampaigns = await AdCampaign.countDocuments({ status: 'active' });
        const totalImpressions = await AdCampaign.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: null, total: { $sum: '$impressions' } } }
        ]);
        const totalClicks = await AdCampaign.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: null, total: { $sum: '$clicks' } } }
        ]);
        const totalSpent = await AdCampaign.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: null, total: { $sum: '$spentBudget' } } }
        ]);

        res.json({
            success: true,
            data: {
                totalCampaigns,
                activeCampaigns,
                totalImpressions: totalImpressions[0]?.total || 0,
                totalClicks: totalClicks[0]?.total || 0,
                totalSpent: totalSpent[0]?.total || 0,
                ctr: totalImpressions[0]?.total > 0 ? ((totalClicks[0]?.total || 0) / totalImpressions[0].total * 100).toFixed(2) : 0
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getCampaignAnalytics = async (req, res) => {
    try {
        const campaign = await AdCampaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const clicksByDate = await AdEvent.aggregate([
            { $match: { campaignId: campaign._id, eventType: 'click' } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        const impressionsByDate = await AdEvent.aggregate([
            { $match: { campaignId: campaign._id, eventType: 'impression' } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                campaign,
                stats: {
                    impressions: campaign.impressions,
                    clicks: campaign.clicks,
                    ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions * 100).toFixed(2) : 0,
                    spentBudget: campaign.spentBudget,
                    remainingBudget: campaign.totalBudget - campaign.spentBudget,
                },
                dailyData: { clicks: clicksByDate, impressions: impressionsByDate }
            }
        });
    } catch (error) {
        console.error('Get campaign analytics error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};