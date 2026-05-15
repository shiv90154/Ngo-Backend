const mongoose = require("mongoose");

const adCampaignSchema = new mongoose.Schema(
    {
        advertiserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        businessName: {
            type: String,
            required: [true, "Business name is required"],
            trim: true,
        },

        content: {
            type: String,
            trim: true,
            maxlength: [2000, "Content cannot exceed 2000 characters"],
        },

        media: [
            {
                type: {
                    type: String,
                    enum: ["image", "video"],
                    required: true,
                },
                url: {
                    type: String,
                    required: true,
                },
                thumbnail: String,
            },
        ],

        ctaText: {
            type: String,
            default: "Learn More",
            enum: ["Learn More", "Shop Now", "Sign Up", "Contact Us", "Apply Now"],
        },

        targetUrl: {
            type: String,
            required: [true, "Target URL is required"],
        },

        totalBudget: {
            type: Number,
            required: true,
            min: [100, "Minimum budget is ₹100"],
        },

        spentBudget: {
            type: Number,
            default: 0,
            min: 0,
        },

        bidAmount: {
            type: Number,
            required: true,
            min: [1, "Bid amount must be at least ₹1"],
        },

        // FIXED: matches your feed query
        targetAudience: {
            allUsers: {
                type: Boolean,
                default: true,
            },

            states: {
                type: [String],
                default: [],
            },

            districts: {
                type: [String],
                default: [],
            },

            blocks: {
                type: [String],
                default: [],
            },

            villages: {
                type: [String],
                default: [],
            },

            roles: {
                type: [String],
                enum: [
                    "SUPER_ADMIN",
                    "ADDITIONAL_DIRECTOR",
                    "STATE_OFFICER",
                    "DISTRICT_MANAGER",
                    "DISTRICT_PRESIDENT",
                    "FIELD_OFFICER",
                    "BLOCK_OFFICER",
                    "VILLAGE_OFFICER",
                    "DOCTOR",
                    "TEACHER",
                    "AGENT",
                    "USER",
                ],
                default: [],
            },

            modules: {
                type: [String],
                enum: [
                    "EDUCATION",
                    "AGRICULTURE",
                    "FINANCE",
                    "HEALTHCARE",
                    "SOCIAL",
                    "IT",
                    "MEDIA",
                    "CRM",
                    "ECOMMERCE",
                ],
                default: [],
            },

            interests: {
                type: [String],
                default: [],
            },

            minAge: {
                type: Number,
                min: 0,
                max: 120,
            },

            maxAge: {
                type: Number,
                min: 0,
                max: 120,
            },

            gender: {
                type: String,
                enum: ["male", "female", "other", "all"],
                default: "all",
            },
        },

        startDate: {
            type: Date,
            default: Date.now,
        },

        endDate: {
            type: Date,
            required: true,
        },

        status: {
            type: String,
            enum: ["draft", "pending_approval", "active", "paused", "completed", "rejected"],
            default: "active",
        },

        rejectionReason: String,

        impressions: {
            type: Number,
            default: 0,
        },

        clicks: {
            type: Number,
            default: 0,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        approvedAt: Date,

        isDeleted: {
            type: Boolean,
            default: false,
        },

        deletedAt: Date,
    },
    { timestamps: true }
);

adCampaignSchema.index({ status: 1, startDate: 1, endDate: 1 });
adCampaignSchema.index({ "targetAudience.allUsers": 1 });
adCampaignSchema.index({ "targetAudience.states": 1 });
adCampaignSchema.index({ "targetAudience.districts": 1 });
adCampaignSchema.index({ "targetAudience.blocks": 1 });
adCampaignSchema.index({ "targetAudience.roles": 1 });
adCampaignSchema.index({ "targetAudience.modules": 1 });
adCampaignSchema.index({ bidAmount: -1 });
adCampaignSchema.index({ isDeleted: 1 });

adCampaignSchema.virtual("isActive").get(function () {
    const now = new Date();

    return (
        this.status === "active" &&
        now >= this.startDate &&
        now <= this.endDate &&
        this.spentBudget < this.totalBudget &&
        !this.isDeleted
    );
});

adCampaignSchema.methods.matchesTargeting = function (user) {
    if (this.targetAudience.allUsers) return true;

    const stateMatch =
        this.targetAudience.states?.length > 0
            ? this.targetAudience.states.includes(user.state)
            : true;

    const districtMatch =
        this.targetAudience.districts?.length > 0
            ? this.targetAudience.districts.includes(user.district)
            : true;

    const blockMatch =
        this.targetAudience.blocks?.length > 0
            ? this.targetAudience.blocks.includes(user.block)
            : true;

    const roleMatch =
        this.targetAudience.roles?.length > 0
            ? this.targetAudience.roles.includes(user.role)
            : true;

    const moduleMatch =
        this.targetAudience.modules?.length > 0
            ? user.modules?.some((m) => this.targetAudience.modules.includes(m))
            : true;

    let ageMatch = true;

    if (user.dob && (this.targetAudience.minAge || this.targetAudience.maxAge)) {
        const age = new Date().getFullYear() - new Date(user.dob).getFullYear();

        if (this.targetAudience.minAge && age < this.targetAudience.minAge) {
            ageMatch = false;
        }

        if (this.targetAudience.maxAge && age > this.targetAudience.maxAge) {
            ageMatch = false;
        }
    }

    const genderMatch =
        this.targetAudience.gender === "all" ||
        this.targetAudience.gender === user.gender;

    const notBlocked = !user.adBlockedCreators?.includes(this.advertiserId);

    return (
        stateMatch &&
        districtMatch &&
        blockMatch &&
        roleMatch &&
        moduleMatch &&
        ageMatch &&
        genderMatch &&
        notBlocked
    );
};

adCampaignSchema.set("toJSON", { virtuals: true });
adCampaignSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("AdCampaign", adCampaignSchema);