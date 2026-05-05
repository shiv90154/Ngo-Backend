const mongoose = require('mongoose');

const adCampaignSchema = new mongoose.Schema(
    {
        // Advertiser / Creator info
        advertiserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        businessName: {
            type: String,
            required: [true, 'Business name is required'],
            trim: true,
        },

        // Ad content (matching MediaPost structure for seamless feed integration)
        content: {
            type: String,
            trim: true,
            maxlength: [2000, 'Content cannot exceed 2000 characters'],
        },
        media: [
            {
                type: { type: String, enum: ['image', 'video'], required: true },
                url: { type: String, required: true },
                thumbnail: String,
            },
        ],

        // Call to action
        ctaText: {
            type: String,
            default: 'Learn More',
            enum: ['Learn More', 'Shop Now', 'Sign Up', 'Contact Us', 'Apply Now'],
        },
        targetUrl: {
            type: String,
            required: [true, 'Target URL is required'],
        },

        // Budget & Bidding
        totalBudget: {
            type: Number,
            required: true,
            min: [100, 'Minimum budget is ₹100'],
        },
        spentBudget: {
            type: Number,
            default: 0,
            min: 0,
        },
        bidAmount: {
            type: Number,
            required: true,
            min: [1, 'Bid amount must be at least ₹1'],
            comment: 'Amount paid per click (CPC)',
        },

        // Targeting (using your existing User fields)
        targetAudience: {
            locations: {
                states: [String],
                districts: [String],
                blocks: [String],
                villages: [String],
            },
            roles: {
                type: [String],
                enum: [
                    'SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_OFFICER',
                    'DISTRICT_MANAGER', 'DISTRICT_PRESIDENT', 'FIELD_OFFICER',
                    'BLOCK_OFFICER', 'VILLAGE_OFFICER', 'DOCTOR', 'TEACHER',
                    'AGENT', 'USER'
                ],
            },
            modules: {
                type: [String],
                enum: ['EDUCATION', 'AGRICULTURE', 'FINANCE', 'HEALTHCARE', 'SOCIAL', 'IT', 'MEDIA', 'CRM', 'ECOMMERCE'],
            },
            interests: [String],
            minAge: { type: Number, min: 0, max: 120 },
            maxAge: { type: Number, min: 0, max: 120 },
            gender: { type: String, enum: ['male', 'female', 'other', 'all'], default: 'all' },
        },

        // Schedule
        startDate: {
            type: Date,
            default: Date.now,
        },
        endDate: {
            type: Date,
            required: true,
        },

        // Status
        status: {
            type: String,
            enum: ['draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected'],
            default: 'pending_approval',
        },
        rejectionReason: String,

        // Analytics
        impressions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },

        // Admin fields (from your User model pattern)
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,

        // Soft delete
        isDeleted: { type: Boolean, default: false },
        deletedAt: Date,
    },
    { timestamps: true }
);

// Indexes for efficient ad selection
adCampaignSchema.index({ status: 1, startDate: 1, endDate: 1 });
adCampaignSchema.index({ 'targetAudience.locations.states': 1 });
adCampaignSchema.index({ 'targetAudience.roles': 1 });
adCampaignSchema.index({ 'targetAudience.modules': 1 });
adCampaignSchema.index({ bidAmount: -1 });
adCampaignSchema.index({ isDeleted: 1 });

// Virtual for checking if campaign is active
adCampaignSchema.virtual('isActive').get(function () {
    const now = new Date();
    return (
        this.status === 'active' &&
        now >= this.startDate &&
        now <= this.endDate &&
        this.spentBudget < this.totalBudget &&
        !this.isDeleted
    );
});

// Method to check if user matches targeting
adCampaignSchema.methods.matchesTargeting = function (user) {
    if (this.targetAudience.optOutOfPersonalizedAds) return false;

    // Check location
    const locationMatch = this.targetAudience.locations.states?.length > 0
        ? this.targetAudience.locations.states.includes(user.state)
        : true;

    // Check role
    const roleMatch = this.targetAudience.roles?.length > 0
        ? this.targetAudience.roles.includes(user.role)
        : true;

    // Check modules
    const moduleMatch = this.targetAudience.modules?.length > 0
        ? user.modules?.some(m => this.targetAudience.modules.includes(m))
        : true;

    // Check age
    let ageMatch = true;
    if (user.dob && (this.targetAudience.minAge || this.targetAudience.maxAge)) {
        const age = new Date().getFullYear() - new Date(user.dob).getFullYear();
        if (this.targetAudience.minAge && age < this.targetAudience.minAge) ageMatch = false;
        if (this.targetAudience.maxAge && age > this.targetAudience.maxAge) ageMatch = false;
    }

    // Check gender
    const genderMatch = this.targetAudience.gender === 'all' || this.targetAudience.gender === user.gender;

    // Check if user blocked this advertiser
    const notBlocked = !user.adBlockedCreators?.includes(this.advertiserId);

    return locationMatch && roleMatch && moduleMatch && ageMatch && genderMatch && notBlocked;
};

adCampaignSchema.set('toJSON', { virtuals: true });
adCampaignSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AdCampaign', adCampaignSchema);