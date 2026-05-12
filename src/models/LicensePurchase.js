const mongoose = require('mongoose');

const licensePurchaseSchema = new mongoose.Schema({
  licenseType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LicenseType',
    required: true
  },
  soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  customerName: {
    type: String,
    required: [true, 'ग्राहक का नाम ज़रूरी है'],
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  commissionDistributed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('LicensePurchase', licensePurchaseSchema);