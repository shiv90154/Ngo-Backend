const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, required: true },
    membershipStatus: { type: String, enum: ['active', 'pending', 'blocked'], default: 'active' },
    membershipFee: { type: Number, default: 0 },
    membershipDate: { type: Date, default: Date.now },
    referralCode: String,
    // Scope (NGO role location)
    state: String,
    district: String,
    block: String,
    village: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

memberSchema.index({ state: 1, district: 1 });
memberSchema.index({ membershipStatus: 1 });

module.exports = mongoose.model('Member', memberSchema);