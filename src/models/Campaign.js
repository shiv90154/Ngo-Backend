const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  goalAmount: { type: Number, required: true, min: 1 },
  raisedAmount: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  image: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

campaignSchema.virtual('progress').get(function () {
  if (this.goalAmount === 0) return 0;
  return Math.min(100, Math.round((this.raisedAmount / this.goalAmount) * 100));
});

campaignSchema.set('toJSON', { virtuals: true });
campaignSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Campaign', campaignSchema);