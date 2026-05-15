const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    block: { type: String, trim: true },
    village: { type: String, trim: true },
    phone: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    age: { type: Number, min: 0 },
    category: { type: String, trim: true },                // e.g., "बुजुर्ग", "महिला", "दिव्यांग"
    lastHelped: Date,
    assistanceHistory: [{ date: Date, description: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

beneficiarySchema.index({ state: 1, district: 1 });
beneficiarySchema.index({ name: 'text', district: 'text' });

module.exports = mongoose.model('Beneficiary', beneficiarySchema);