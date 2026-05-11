// backend/src/models/Donation.js (unchanged, already complete)
const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donorName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    amount: { type: Number, required: true, min: 0 },
    purpose: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['online', 'cash'], default: 'online' },
    receiptUrl: String,
    // Scope fields
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    block: { type: String, trim: true },
    village: { type: String, trim: true },
    // Razorpay transaction id
    transactionId: { type: String, default: null },
    // Ref to donor (if logged in)
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

donationSchema.index({ state: 1, district: 1 });
donationSchema.index({ createdAt: -1 });
donationSchema.index({ donorName: 'text', email: 'text' });

module.exports = mongoose.model('Donation', donationSchema);