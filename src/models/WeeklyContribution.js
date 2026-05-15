const mongoose = require('mongoose');

const weeklyContributionSchema = new mongoose.Schema({
  gramVikasAdhikari: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  village: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  purpose: {
    type: String,
    enum: ['school', 'hospital', 'social_service', 'other'],
    default: 'social_service'
  },
  date: {
    type: Date,
    default: Date.now
  },
  receiptNo: String
}, { timestamps: true });

module.exports = mongoose.model('WeeklyContribution', weeklyContributionSchema);