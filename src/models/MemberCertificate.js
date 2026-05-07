const mongoose = require('mongoose');

const memberCertificateSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['membership_certificate', 'id_card', 'appointment_letter', 'achievement', 'visitor'],
    required: true,
  },
  template: { type: Number, default: 1, min: 1, max: 6 },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  certificateUrl: String,
  qrCodeUrl: String,
  verificationCode: { type: String, unique: true },
  issuedAt: { type: Date, default: Date.now },
  notes: String,
}, { timestamps: true });

memberCertificateSchema.index({ member: 1 });
memberCertificateSchema.index({ verificationCode: 1 });

module.exports = mongoose.model('MemberCertificate', memberCertificateSchema);