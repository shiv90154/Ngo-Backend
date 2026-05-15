const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    goalAmount: { type: Number, required: true, min: 0 },
    collectedAmount: { type: Number, default: 0, min: 0 },
    startDate: Date,
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    // Scope fields
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    block: { type: String, trim: true },
    village: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

campaignSchema.index({ status: 1, endDate: 1 });
campaignSchema.index({ state: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);