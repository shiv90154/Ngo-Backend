const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },             // e.g. "Education Pro"
  module: { type: String, enum: ['EDUCATION', 'HEALTH', 'AGRICULTURE', 'ALL'], required: true },
  price: { type: Number, required: true },             // in INR
  durationDays: { type: Number, required: true },      // e.g. 30, 90, 365
  features: [String],                                   // display perks
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);