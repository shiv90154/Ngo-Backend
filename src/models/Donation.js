const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'CARD', 'NET_BANKING', 'WALLET', 'CASH'],
    default: 'UPI'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  // 📸 UPI/Cash payment ka screenshot
  paymentProofImage: {
    type: String,   // Cloudinary / S3 URL
    default: null
  },
  receiptNumber: {
    type: String,
    unique: true
  },
  receiptUrl: String,
  status: {
    type: String,
    enum: ['PENDING', 'PENDING_VERIFICATION', 'SUCCESS', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  message: String,
  donatedAt: {
    type: Date,
    default: Date.now
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: Date
}, { timestamps: true });

// Auto‑generate receipt number
donationSchema.pre('save', async function() {
  if (this.isNew && !this.receiptNumber) {
    const datePart = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const random = Math.floor(100000 + Math.random() * 900000).toString();
    this.receiptNumber = `DON-${datePart}-${random}`;
  }
});

module.exports = mongoose.model('Donation', donationSchema);