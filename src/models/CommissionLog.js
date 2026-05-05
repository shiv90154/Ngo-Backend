const mongoose = require('mongoose');
const logSchema = new mongoose.Schema({
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'LicensePurchase' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  role: String,
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' }
}, { timestamps: true });
module.exports = mongoose.model('CommissionLog', logSchema);