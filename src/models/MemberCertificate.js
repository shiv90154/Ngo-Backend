const mongoose = require('mongoose');

const memberCertificateSchema = new mongoose.Schema(
  {
    memberName: { type: String, required: true, trim: true },
    certificateType: { type: String, required: true }, // "membership_certificate", "achievement", "visitor", etc.
    customMessage: String,
    template: { type: Number, default: 1 },
    issuedDate: { type: Date, default: Date.now },
    verificationCode: { type: String, unique: true, required: true },
    certificateUrl: String,                    // PDF file path
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

memberCertificateSchema.index({ verificationCode: 1 });

module.exports = mongoose.model('MemberCertificate', memberCertificateSchema);