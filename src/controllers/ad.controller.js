const AdCampaign = require('../models/AdCampaign');
const AdEvent = require('../models/AdEvent');
const User = require('../models/user.model');
const path = require('path');
const fs = require('fs').promises;
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const mediaController = require('./media.controller');  // shared helpers

// ---------- HELPER : delete file ----------
const deleteFile = async (filePath) => {
    try { await fs.unlink(path.join(__dirname, '..', filePath)); } catch { }
};

// ---------- FEED AD ----------
exports.getFeedAd = catchAsync(async (req, res, next) => {
    const ad = await mediaController._getAdForFeed(
        req.user.id,
        req.user.role,
        req.user.state,
        req.user.district,
        req.user.block
    );

    if (!ad) {
        return res.json({ success: true, ad: null, message: 'कोई विज्ञापन उपलब्ध नहीं' });
    }

    const adResponse = mediaController._transformAdToPost(ad);
    res.json({ success: true, ad: adResponse });
});

// ---------- TRACK CLICK ----------
exports.trackClick = catchAsync(async (req, res, next) => {
    const { campaignId, adId } = req.body;
    const actualId = campaignId || adId;
    if (!actualId) throw new AppError('campaignId आवश्यक है', 400);

    const campaign = await AdCampaign.findById(actualId);
    if (!campaign) throw new AppError('विज्ञापन नहीं मिला', 404);

    campaign.clicks += 1;
    campaign.spentBudget += campaign.bidAmount || 0;
    await campaign.save();

    await AdEvent.create({
        campaignId: actualId,
        userId: req.user.id,
        eventType: 'click',
        metadata: {
            userLocation: { state: req.user.state, district: req.user.district },
            userRole: req.user.role,
        },
    });

    await User.findByIdAndUpdate(req.user.id, {
        $push: { adsSeen: { campaignId: actualId, clicked: true, clickedAt: new Date() } },
    });

    res.json({ success: true, message: 'क्लिक दर्ज किया गया' });
});

// ---------- TRACK IMPRESSION ----------
exports.trackImpression = catchAsync(async (req, res, next) => {
    const { campaignId } = req.body;
    if (!campaignId) throw new AppError('campaignId आवश्यक है', 400);

    await AdEvent.create({
        campaignId,
        userId: req.user.id,
        eventType: 'impression',
        metadata: {
            userLocation: { state: req.user.state, district: req.user.district },
            userRole: req.user.role,
        },
    });

    await AdCampaign.findByIdAndUpdate(campaignId, { $inc: { impressions: 1 } });
    res.json({ success: true, message: 'इम्प्रेशन दर्ज' });
});

// ---------- CREATE CAMPAIGN (ADMIN) ----------
exports.createCampaign = catchAsync(async (req, res, next) => {
    const {
        businessName, content, ctaText, targetUrl,
        totalBudget, bidAmount, targetAudience,
        startDate, endDate,
    } = req.body;

    if (!businessName || !targetUrl || !totalBudget || !bidAmount || !endDate) {
        throw new AppError('सभी आवश्यक फ़ील्ड भरें', 400);
    }

    const media = (req.files || []).map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 'video',
        url: `/uploads/ads/${file.filename}`,
        thumbnail: file.mimetype.startsWith('video/') ? `/uploads/ads/thumb_${file.filename}.jpg` : undefined,
    }));

    // Parse targetAudience if string
    let audience = targetAudience;
    if (typeof audience === 'string') {
        try { audience = JSON.parse(audience); } catch { throw new AppError('अमान्य targetAudience फ़ॉर्मैट', 400); }
    }

    const campaign = await AdCampaign.create({
        advertiserId: req.user.id,
        businessName,
        content: content || '',
        media,
        ctaText: ctaText || 'Learn More',
        targetUrl,
        totalBudget: parseFloat(totalBudget),
        bidAmount: parseFloat(bidAmount),
        targetAudience: audience || {},
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: new Date(endDate),
        createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: campaign });
});

// ---------- GET CAMPAIGNS (ADMIN) ----------
exports.getCampaigns = catchAsync(async (req, res, next) => {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { isDeleted: false };
    if (status) query.status = status;

    const [campaigns, total] = await Promise.all([
        AdCampaign.find(query)
            .populate('advertiserId', 'fullName email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean(),
        AdCampaign.countDocuments(query),
    ]);

    res.json({
        success: true,
        data: campaigns,
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
    });
});

// ---------- GET SINGLE CAMPAIGN ----------
exports.getCampaign = catchAsync(async (req, res, next) => {
    const campaign = await AdCampaign.findById(req.params.id)
        .populate('advertiserId', 'fullName email')
        .populate('createdBy', 'fullName')
        .populate('approvedBy', 'fullName')
        .lean();

    if (!campaign || campaign.isDeleted) throw new AppError('कैम्पेन नहीं मिला', 404);
    res.json({ success: true, data: campaign });
});

// ---------- UPDATE CAMPAIGN ----------
exports.updateCampaign = catchAsync(async (req, res, next) => {
    const campaign = await AdCampaign.findById(req.params.id);
    if (!campaign || campaign.isDeleted) throw new AppError('कैम्पेन नहीं मिला', 404);

    const updates = { ...req.body };

    // Handle media uploads
    if (req.files && req.files.length) {
        // Delete old media files (optional safety)
        for (const old of campaign.media || []) await deleteFile(old.url);

        const media = req.files.map(file => ({
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            url: `/uploads/ads/${file.filename}`,
        }));
        updates.media = media;
    }

    if (updates.targetAudience && typeof updates.targetAudience === 'string') {
        try { updates.targetAudience = JSON.parse(updates.targetAudience); } catch { throw new AppError('अमान्य targetAudience', 400); }
    }

    const updated = await AdCampaign.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
    });

    res.json({ success: true, data: updated });
});

// ---------- DELETE CAMPAIGN (SOFT) ----------
exports.deleteCampaign = catchAsync(async (req, res, next) => {
    await AdCampaign.findByIdAndUpdate(req.params.id, {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'completed',
    });
    res.json({ success: true, message: 'कैम्पेन हटा दिया गया' });
});

// ---------- UPDATE CAMPAIGN STATUS ----------
exports.updateCampaignStatus = catchAsync(async (req, res, next) => {
    const { status } = req.body;
    if (!status) throw new AppError('status आवश्यक है', 400);

    const updateData = { status };
    if (status === 'active') {
        updateData.approvedBy = req.user.id;
        updateData.approvedAt = new Date();
    }

    const campaign = await AdCampaign.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!campaign) throw new AppError('कैम्पेन नहीं मिला', 404);

    res.json({ success: true, data: campaign });
});

// ---------- ANALYTICS (GLOBAL) ----------
exports.getAnalytics = catchAsync(async (req, res, next) => {
    const [totalCampaigns, activeCampaigns, agg] = await Promise.all([
        AdCampaign.countDocuments({ isDeleted: false }),
        AdCampaign.countDocuments({ status: 'active', isDeleted: false }),
        AdCampaign.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: null, impressions: { $sum: '$impressions' }, clicks: { $sum: '$clicks' }, spent: { $sum: '$spentBudget' } } },
        ]),
    ]);

    const stats = agg[0] || { impressions: 0, clicks: 0, spent: 0 };
    const ctr = stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) : 0;

    res.json({
        success: true,
        data: {
            totalCampaigns,
            activeCampaigns,
            totalImpressions: stats.impressions,
            totalClicks: stats.clicks,
            totalSpent: stats.spent,
            ctr,
        },
    });
});

// ---------- CAMPAIGN ANALYTICS ----------
exports.getCampaignAnalytics = catchAsync(async (req, res, next) => {
    const campaign = await AdCampaign.findById(req.params.id).lean();
    if (!campaign) throw new AppError('कैम्पेन नहीं मिला', 404);

    const [clicksByDate, impressionsByDate] = await Promise.all([
        AdEvent.aggregate([
            { $match: { campaignId: campaign._id, eventType: 'click' } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
        AdEvent.aggregate([
            { $match: { campaignId: campaign._id, eventType: 'impression' } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
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
            dailyData: { clicks: clicksByDate, impressions: impressionsByDate },
        },
    });
});
