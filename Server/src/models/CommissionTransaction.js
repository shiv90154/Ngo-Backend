const mongoose = require('mongoose');

const commissionTransactionSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:  { type: Number, required: true },
  level:   { type: Number, default: 1 },
  type:    { type: String, enum: ['course_enroll', 'product_purchase', 'wallet_topup', 'subscription'], required: true },
  referenceId: String,
  status:  { type: String, enum: ['pending', 'paid'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommissionTransaction', commissionTransactionSchema);