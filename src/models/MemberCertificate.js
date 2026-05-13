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
      trim: true
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

    certificateUrl: {
      type: String,
      trim: true,
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

    state: String,
    district: String,
    block: String,
    village: String,
  },
  { timestamps: true }
);

memberCertificateSchema.index({ verificationCode: 1 });
memberCertificateSchema.index({ issuedBy: 1 });

module.exports = mongoose.model(
  'MemberCertificate',
  memberCertificateSchema
);