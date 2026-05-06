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

        if (!actualCampaignId) {
            return res.status(400).json({
                success: false,
                message: "Campaign id is required",
            });
        }

        const existingCampaign = await AdCampaign.findById(actualCampaignId);

        if (!existingCampaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        await AdCampaign.findByIdAndUpdate(actualCampaignId, {
            $inc: {
                clicks: 1,
                spentBudget: existingCampaign.bidAmount || 0,
            },
        });

        await AdEvent.create({
            campaignId: actualCampaignId,
            userId: req.user.id,
            eventType: "click",
            metadata: {
                userLocation: {
                    state: req.user.state,
                    district: req.user.district,
                },
                userRole: req.user.role,
            },
        });

        res.json({
            success: true,
            message: "Click tracked",
        });
    } catch (error) {
        console.error("Track click error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
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

// ========== ADMIN CONTROLLERS ==========const 
SENIOR_ROLES = [
    "SUPER_ADMIN",
    "ADDITIONAL_DIRECTOR",
    "STATE_OFFICER",
    "DISTRICT_MANAGER",
    "DISTRICT_PRESIDENT",
];

const normalizeTargetAudience = (targetAudience) => {
    let parsed = {};

    if (targetAudience) {
        parsed =
            typeof targetAudience === "string"
                ? JSON.parse(targetAudience)
                : targetAudience;
    }

    return {
        allUsers: parsed.allUsers ?? true,
        states: Array.isArray(parsed.states) ? parsed.states : [],
        districts: Array.isArray(parsed.districts) ? parsed.districts : [],
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
        roles: Array.isArray(parsed.roles) ? parsed.roles : [],
    };
};

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

        if (req.files?.length > 0) {
            for (const file of req.files) {
                const fileType = file.mimetype.startsWith("image/") ? "image" : "video";

                media.push({
                    type: fileType,
                    url: `/uploads/ads/${file.filename}`,
                    thumbnail:
                        fileType === "video"
                            ? `/uploads/ads/thumb_${file.filename}.jpg`
                            : null,
                });
            }
        }

        const campaign = await AdCampaign.create({
            advertiserId: req.user.id,
            createdBy: req.user.id,

            businessName,
            content,
            media,
            ctaText: ctaText || "Learn More",
            targetUrl,

            totalBudget: Number(totalBudget),
            bidAmount: Number(bidAmount) || 1,

            targetAudience: normalizeTargetAudience(targetAudience),

            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate
                ? new Date(endDate)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),

            status: "pending_approval",
        });

        res.status(201).json({
            success: true,
            message: "Campaign submitted for approval",
            data: campaign,
        });
    } catch (error) {
        console.error("Create campaign error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.getCampaigns = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

        const query = { isDeleted: false };

        if (status) query.status = status;

        // Normal users see only their own campaigns
        // Senior roles see all campaigns
        if (!SENIOR_ROLES.includes(req.user.role)) {
            query.advertiserId = req.user.id;
        }

        const [campaigns, total] = await Promise.all([
            AdCampaign.find(query)
                .populate("advertiserId", "fullName email profileImage role")
                .populate("createdBy", "fullName email profileImage role")
                .populate("approvedBy", "fullName email profileImage role")
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * limitNumber)
                .limit(limitNumber)
                .lean(),

            AdCampaign.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: campaigns,
            total,
            page: pageNumber,
            pages: Math.ceil(total / limitNumber),
        });
    } catch (error) {
        console.error("Get campaigns error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

exports.getCampaign = async (req, res) => {
    try {
        const campaign = await AdCampaign.findById(req.params.id)
            .populate("advertiserId", "fullName email profileImage role")
            .populate("createdBy", "fullName email profileImage role")
            .populate("approvedBy", "fullName email profileImage role");

        if (!campaign || campaign.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        const advertiserId =
            campaign.advertiserId?._id?.toString() ||
            campaign.advertiserId?.toString();

        const isOwner = advertiserId === req.user.id;
        const isSenior = SENIOR_ROLES.includes(req.user.role);

        if (!isOwner && !isSenior) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to view this campaign",
            });
        }

        res.json({
            success: true,
            data: campaign,
        });
    } catch (error) {
        console.error("Get campaign error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const campaign = await AdCampaign.findById(req.params.id);

        if (!campaign || campaign.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        const isOwner = campaign.advertiserId.toString() === req.user.id;
        const isSenior = SENIOR_ROLES.includes(req.user.role);

        if (!isOwner && !isSenior) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this campaign",
            });
        }

        if (campaign.status === "active" && !isSenior) {
            return res.status(403).json({
                success: false,
                message: "Active campaigns can only be updated by senior roles",
            });
        }

        const updates = { ...req.body };

        delete updates.status;
        delete updates.approvedBy;
        delete updates.approvedAt;
        delete updates.impressions;
        delete updates.clicks;
        delete updates.spentBudget;
        delete updates.createdBy;
        delete updates.advertiserId;

        if (updates.targetAudience) {
            updates.targetAudience = normalizeTargetAudience(updates.targetAudience);
        }

        if (updates.totalBudget !== undefined) {
            updates.totalBudget = Number(updates.totalBudget);
        }

        if (updates.bidAmount !== undefined) {
            updates.bidAmount = Number(updates.bidAmount);
        }

        if (updates.startDate) {
            updates.startDate = new Date(updates.startDate);
        }

        if (updates.endDate) {
            updates.endDate = new Date(updates.endDate);
        }

        if (req.files?.length > 0) {
            updates.media = req.files.map((file) => {
                const fileType = file.mimetype.startsWith("image/") ? "image" : "video";

                return {
                    type: fileType,
                    url: `/uploads/ads/${file.filename}`,
                    thumbnail:
                        fileType === "video"
                            ? `/uploads/ads/thumb_${file.filename}.jpg`
                            : null,
                };
            });
        }

        if (isOwner && !isSenior) {
            updates.status = "pending_approval";
            updates.approvedBy = undefined;
            updates.approvedAt = undefined;
        }

        const updated = await AdCampaign.findByIdAndUpdate(req.params.id, updates, {
            returnDocument: "after",
            runValidators: true,
        });

        res.json({
            success: true,
            message:
                isOwner && !isSenior
                    ? "Campaign updated and sent for approval"
                    : "Campaign updated",
            data: updated,
        });
    } catch (error) {
        console.error("Update campaign error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        const campaign = await AdCampaign.findById(req.params.id);

        if (!campaign || campaign.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        const isOwner = campaign.advertiserId.toString() === req.user.id;
        const isSenior = SENIOR_ROLES.includes(req.user.role);

        if (!isOwner && !isSenior) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this campaign",
            });
        }

        campaign.isDeleted = true;
        campaign.deletedAt = new Date();
        campaign.status = "completed";

        await campaign.save();

        res.json({
            success: true,
            message: "Campaign deleted",
        });
    } catch (error) {
        console.error("Delete campaign error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.updateCampaignStatus = async (req, res) => {
    try {
        if (!SENIOR_ROLES.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Only senior roles can approve or reject campaigns",
            });
        }

        const { status, rejectionReason } = req.body;

        const allowedStatuses = [
            "pending_approval",
            "active",
            "paused",
            "completed",
            "rejected",
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid campaign status",
            });
        }

        const updateData = { status };

        if (status === "active") {
            updateData.approvedBy = req.user.id;
            updateData.approvedAt = new Date();
            updateData.rejectionReason = undefined;
        }

        if (status === "rejected") {
            updateData.rejectionReason = rejectionReason || "Campaign rejected";
        }

        const campaign = await AdCampaign.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            updateData,
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        res.json({
            success: true,
            message:
                status === "active"
                    ? "Campaign approved and activated"
                    : `Campaign marked as ${status}`,
            data: campaign,
        });
    } catch (error) {
        console.error("Update status error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const query = { isDeleted: false };

        if (!SENIOR_ROLES.includes(req.user.role)) {
            query.advertiserId = req.user.id;
        }

        const [totalCampaigns, activeCampaigns, totalImpressions, totalClicks, totalSpent] =
            await Promise.all([
                AdCampaign.countDocuments(query),
                AdCampaign.countDocuments({ ...query, status: "active" }),
                AdCampaign.aggregate([
                    { $match: query },
                    { $group: { _id: null, total: { $sum: "$impressions" } } },
                ]),
                AdCampaign.aggregate([
                    { $match: query },
                    { $group: { _id: null, total: { $sum: "$clicks" } } },
                ]),
                AdCampaign.aggregate([
                    { $match: query },
                    { $group: { _id: null, total: { $sum: "$spentBudget" } } },
                ]),
            ]);

        const impressions = totalImpressions[0]?.total || 0;
        const clicks = totalClicks[0]?.total || 0;

        res.json({
            success: true,
            data: {
                totalCampaigns,
                activeCampaigns,
                totalImpressions: impressions,
                totalClicks: clicks,
                totalSpent: totalSpent[0]?.total || 0,
                ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0,
            },
        });
    } catch (error) {
        console.error("Get analytics error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.getCampaignAnalytics = async (req, res) => {
    try {
        const campaign = await AdCampaign.findById(req.params.id);

        if (!campaign || campaign.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        const isOwner = campaign.advertiserId.toString() === req.user.id;
        const isSenior = SENIOR_ROLES.includes(req.user.role);

        if (!isOwner && !isSenior) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to view analytics",
            });
        }

        const [clicksByDate, impressionsByDate] = await Promise.all([
            AdEvent.aggregate([
                { $match: { campaignId: campaign._id, eventType: "click" } },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),

            AdEvent.aggregate([
                { $match: { campaignId: campaign._id, eventType: "impression" } },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                        },
                        count: { $sum: 1 },
                    },
                },
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
                    ctr:
                        campaign.impressions > 0
                            ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                            : 0,
                    spentBudget: campaign.spentBudget,
                    remainingBudget: campaign.totalBudget - campaign.spentBudget,
                },
                dailyData: {
                    clicks: clicksByDate,
                    impressions: impressionsByDate,
                },
            },
        });
    } catch (error) {
        console.error("Get campaign analytics error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};