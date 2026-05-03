const mongoose = require('mongoose');
const purchaseSchema = new mongoose.Schema({
  licenseType: { type: mongoose.Schema.Types.ObjectId, ref: 'LicenseType', required: true },
  soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // the Gram Vikas Adhikari / agent
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },                 // optional end customer
  purchaseDate: { type: Date, default: Date.now },
  commissionDistributed: { type: Boolean, default: false },
  // Distributed amounts will be stored in a separate commission log
}, { timestamps: true });

module.exports = mongoose.model('LicensePurchase', purchaseSchema);