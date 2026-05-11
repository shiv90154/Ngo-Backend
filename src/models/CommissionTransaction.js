// backend/src/models/CommissionTransaction.js
const mongoose = require('mongoose');

const commissionTransactionSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:  { type: Number, required: true },
  level:   { type: Number, default: 1 },
  type:    {
    type: String,
    enum: [
      'course_enroll',
      'product_purchase',
      'wallet_topup',
      'subscription',
      'license_sale',          // 🆕 added
      'education_sale',        // 🆕 added
      'donation',              // 🆕 added (optional, if you want to reward donations)
      'other'                  // 🆕 fallback
    ],
    required: true
  },
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  status:  { type: String, enum: ['pending', 'paid'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommissionTransaction', commissionTransactionSchema);