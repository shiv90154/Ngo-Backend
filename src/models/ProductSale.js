const mongoose = require('mongoose');

const productSaleSchema = new mongoose.Schema({
  productType: {
    type: String,
    enum: ['license', 'education'],
    required: true
  },
  // For license
  licenseType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LicenseType',
    default: null
  },
  // For education program
  educationProgram: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EducationProgram',
    default: null
  },
  customerName: {
    type: String,
    required: [true, 'ग्राहक का नाम ज़रूरी है']
  },
  customerPhone: {
    type: String,
    default: ''
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null          // बाद में लिंक हो सके
  },
  amount: {
    type: Number,
    required: true
  },
  soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  transactionId: {
    type: String,           // रेज़रपे / ऑफ़लाइन रेफ़रेंस
    default: null
  },
  commissionDistributed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('ProductSale', productSaleSchema);