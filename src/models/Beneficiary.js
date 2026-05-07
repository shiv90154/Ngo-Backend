const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    block: { type: String, trim: true },
    village: { type: String, trim: true },
    category: {
      type: String,
      enum: ['education', 'health', 'livelihood', 'women', 'child', 'elderly', 'other'],
      default: 'other',
    },
    notes: { type: String, trim: true },
    enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },    // Gram Vikas Adhikari
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

beneficiarySchema.index({ state: 1, district: 1 });
beneficiarySchema.index({ category: 1 });
beneficiarySchema.index({ name: 'text', phone: 'text' });

module.exports = mongoose.model('Beneficiary', beneficiarySchema);