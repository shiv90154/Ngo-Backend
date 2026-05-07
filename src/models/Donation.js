const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['online', 'cash', 'bank_transfer', 'cheque'],
    required: true,
  },
  transactionId: String,
  receiptUrl: String,        // PDF receipt URL
  qrCodeUrl: String,          // QR code image URL
  purpose: String,
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  donationDate: { type: Date, default: Date.now },
  receiptEmailed: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Donation', donationSchema);