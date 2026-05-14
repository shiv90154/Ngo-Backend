// backend/src/models/CommissionSplit.js
const mongoose = require('mongoose');

const commissionSplitSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  levelOffset: {
    type: Number,
    default: 0,
  },
  productType: {
    type: String,
    enum: ['license', 'education', 'agriculture', 'donation', 'all'],
    default: 'all',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Compound index so that roleName + productType is unique
commissionSplitSchema.index({ roleName: 1, productType: 1 }, { unique: true });

module.exports = mongoose.model('CommissionSplit', commissionSplitSchema);