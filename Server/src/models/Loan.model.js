const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  emiAmount: { type: Number, required: true },
  tenureMonths: { type: Number, required: true },
  outstanding: { type: Number, required: true },
  interestRate: { type: Number, default: 12 },
  nextDueDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'closed', 'defaulted'], default: 'active' },
  sanctionedAt: { type: Date, default: Date.now },
  closedAt: Date,
  emisPaid: { type: Number, default: 0 }
});

loanSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Loan', loanSchema);