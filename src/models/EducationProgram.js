const mongoose = require('mongoose');

const educationProgramSchema = new mongoose.Schema({
  class: {
    type: Number,
    required: true,
    unique: true,
    min: 6,
    max: 12
  },
  fee: {
    type: Number,
    required: true,
    min: 0
  },
  incentive: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('EducationProgram', educationProgramSchema);