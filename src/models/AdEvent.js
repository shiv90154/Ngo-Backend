const mongoose = require('mongoose');

const adEventSchema = new mongoose.Schema(
    {
        campaignId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AdCampaign',
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        eventType: {
            type: String,
            enum: ['impression', 'click'],
            required: true,
        },
        metadata: {
            userLocation: {
                state: String,
                district: String,
                block: String,
            },
            userRole: String,
            deviceInfo: String,
            ipAddress: String,
        },
        // For tracking if this click led to a conversion
        convertedAt: Date,
        conversionValue: Number,
    },
    { timestamps: true }
);

// Indexes for analytics queries
adEventSchema.index({ campaignId: 1, createdAt: -1 });
adEventSchema.index({ userId: 1, createdAt: -1 });
adEventSchema.index({ eventType: 1, createdAt: -1 });
adEventSchema.index({ createdAt: -1 });

// For rate limiting (prevent showing same ad too often)
adEventSchema.index({ userId: 1, campaignId: 1, createdAt: -1 });

module.exports = mongoose.model('AdEvent', adEventSchema);