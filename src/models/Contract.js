const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      unique: true, // एक रोल के लिए केवल एक एक्टिव कॉन्ट्रैक्ट
      enum: [
        // सभी मौजूदा रोल्स
        'SUPER_ADMIN', 'ADDITIONAL_DIRECTOR',
        'STATE_DEVELOPMENT_COORDINATOR', 'DISTRICT_BRANCH_MANAGER',
        'DISTRICT_PRESIDENT', 'DISTRICT_FIELD_COORDINATOR',
        'BAMS_DOCTOR', 'BLOCK_DEVELOPMENT_COORDINATOR',
        'GRAM_DEVELOPMENT_COORDINATOR',
        'IT_DEVELOPER', 'TEACHER', 'NEWS_EDITOR',
        'AGRICULTURE_CONSULTANCY', 'FINANCE_SERVICE_CONSULTANCY',
        'NGO_CONSULTANCY', 'PROJECT_BASED_INTEGRATED_ROLE',
        'VENDOR', 'AGENT', 'USER',
      ],
    },
    title: { type: String, required: true },
    content: { type: String, required: true },           // HTML content of the agreement
    terms: [String],                                     // array of terms & conditions
    requiredFields: [String],                            // user must fill these fields (e.g., "processingFee", "securityDeposit")
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

contractSchema.index({ role: 1 });

module.exports = mongoose.model('Contract', contractSchema);