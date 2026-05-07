const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    enum: ['travel', 'events', 'utilities', 'staff', 'office', 'marketing', 'other'],
    default: 'other',
  },
  date: { type: Date, default: Date.now },
  description: String,
  receiptUrl: String,                // optional uploaded receipt
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

expenseSchema.index({ category: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);