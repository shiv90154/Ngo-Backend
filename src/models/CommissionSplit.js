const mongoose = require('mongoose');
const splitSchema = new mongoose.Schema({
  roleName: { type: String, required: true },    // "ADDITIONAL_DIRECTOR", "BLOCK", etc.
  percentage: { type: Number, required: true },  // 5, 10, ...
  levelOffset: { type: Number, default: 0 },     // 0 = direct upline, 1 = upline's upline, etc.
  isActive: { type: Boolean, default: true }
});
module.exports = mongoose.model('CommissionSplit', splitSchema);