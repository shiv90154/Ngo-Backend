const mongoose = require('mongoose');

const memberCertificateSchema = new mongoose.Schema(
  {
    memberName: {
      type: String,
      required: true,
      trim: true
    },
    certificateType: {
      type: String,
      required: true,
      trim: true       // e.g., "सेवा प्रमाण पत्र", "प्रशस्ति पत्र"
    },
    customMessage: {
      type: String,
      trim: true
    },
    verificationCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    issuedDate: {
      type: Date,
      default: Date.now
    },
    // Scope fields (optional, if needed)
    state: String,
    district: String,
    block: String,
    village: String,
  },
  { timestamps: true }
);

memberCertificateSchema.index({ verificationCode: 1 });
memberCertificateSchema.index({ issuedBy: 1 });

module.exports = mongoose.model('MemberCertificate', memberCertificateSchema);