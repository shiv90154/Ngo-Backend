const mongoose = require('mongoose');

const billPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  billType: { type: String, enum: ['electricity', 'water', 'gas', 'internet', 'mobile', 'other'], required: true },
  billNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paidAt: Date,
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BillPayment', billPaymentSchema);