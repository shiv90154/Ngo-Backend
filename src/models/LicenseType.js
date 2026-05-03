const mongoose = require('mongoose');
const licenseTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },           // "Kishori Care License"
  code: { type: String, unique: true },             // "KCL"
  membershipFee: { type: Number, required: true },   // ₹200
  incentiveAmount: { type: Number, required: true }, // ₹50
  description: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LicenseType', licenseTypeSchema);