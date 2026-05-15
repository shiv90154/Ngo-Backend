const mongoose = require('mongoose');

const piShareSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'ADDITIONAL_DIRECTOR',
      'STATE_DEVELOPMENT_COORDINATOR',
      'DISTRICT_BRANCH_MANAGER',
      'DISTRICT_PRESIDENT',
      'DISTRICT_FIELD_COORDINATOR',
      'BAMS_DOCTOR',
      'BLOCK_DEVELOPMENT_COORDINATOR',
      'GRAM_DEVELOPMENT_COORDINATOR',
      'NGO_CLUB',
      'USER',
    ],
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('PIShare', piShareSchema);