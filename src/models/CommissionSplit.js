const mongoose = require('mongoose');

const commissionSplitSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: true,
    unique: true
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  levelOffset: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('CommissionSplit', commissionSplitSchema);