const mongoose = require('mongoose');

const licenseTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'License type name is required'],
    trim: true
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  membershipFee: {
    type: Number,
    required: [true, 'Membership fee is required'],
    min: [0, 'Fee cannot be negative']
  },
  incentiveAmount: {
    type: Number,
    required: [true, 'Incentive amount is required'],
    min: [0, 'Incentive cannot be negative']
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('LicenseType', licenseTypeSchema);