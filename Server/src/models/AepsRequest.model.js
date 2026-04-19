const mongoose = require('mongoose');

const aepsRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  aadhaarNumber: { type: String, required: true },
  bankIIN: { type: String },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['withdrawal', 'balance_check'], default: 'withdrawal' },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  providerResponse: { type: Object },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  createdAt: { type: Date, default: Date.now }
});

aepsRequestSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AepsRequest', aepsRequestSchema);