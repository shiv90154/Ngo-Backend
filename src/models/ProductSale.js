// backend/src/models/ProductSale.js
const mongoose = require('mongoose');

const productSaleSchema = new mongoose.Schema({
  productType: { type: String, enum: ['license', 'education'], required: true },
  // For license
  licenseType: { type: mongoose.Schema.Types.ObjectId, ref: 'LicenseType', default: null },
  // For education program
  educationProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'EducationProgram', default: null },
  customerName: { type: String, required: true },
  customerPhone: { type: String, default: '' },
  amount: { type: Number, required: true },
  soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purchaseDate: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('ProductSale', productSaleSchema);