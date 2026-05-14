const mongoose = require('mongoose');

const commissionLogSchema = new mongoose.Schema({
  // किस purchase पर कमीशन मिला
  purchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LicensePurchase',
    default: null,
  },
  
  // किस sale पर कमीशन मिला (ProductSale के लिए)
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductSale',
    default: null,
  },
  
  // जिसको कमीशन मिला (स्पॉन्सर)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // जिसकी वजह से कमीशन ट्रिगर हुआ (downline)
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  
  // कमीशन राशि
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // प्रोडक्ट टाइप — license, education, agriculture, donation
  productType: {
    type: String,
    enum: ['license', 'education', 'agriculture', 'donation', 'wallet_topup', 'other'],
    required: true,
  },
  
  // कमीशन का प्रतिशत
  percentage: {
    type: Number,
    default: 0,
  },
  
  // कौन से लेवल पर कमीशन मिला (1 = डायरेक्ट स्पॉन्सर, 2 = उसका स्पॉन्सर...)
  level: {
    type: Number,
    default: 1,
  },
  
  // स्पॉन्सर की भूमिका
  role: {
    type: String,
    default: '',
  },
  
  // स्टेटस — pending या paid
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending',
  },
  
  // कमीशन का विवरण
  description: {
    type: String,
    default: '',
  },
  
}, { timestamps: true });

// इंडेक्सेस
commissionLogSchema.index({ user: 1, status: 1 });
commissionLogSchema.index({ purchase: 1 });
commissionLogSchema.index({ sale: 1 });
commissionLogSchema.index({ productType: 1 });
commissionLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CommissionLog', commissionLogSchema);