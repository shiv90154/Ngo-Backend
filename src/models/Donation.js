const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donorName: { type: String, trim: true },               // optional, अनाम हो सकता है
    email: { type: String, trim: true, lowercase: true },
    amount: { type: Number, required: true, min: 0 },
    purpose: { type: String, trim: true },                 // e.g., "शिक्षा", "स्वास्थ्य"
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['online', 'cash'], default: 'online' },
    receiptUrl: String,                                    // generated PDF/UUID
    // Scope fields (filled automatically via scopeFilter middleware)
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    block: { type: String, trim: true },
    village: { type: String, trim: true },
    // Metadata
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // donor (if registered)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },           // NGO officer who created entry
  },
  { timestamps: true }
);

donationSchema.index({ state: 1, district: 1 });
donationSchema.index({ createdAt: -1 });
donationSchema.index({ donorName: 'text', email: 'text' });

module.exports = mongoose.model('Donation', donationSchema);