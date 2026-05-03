const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    genericName: { type: String, trim: true },
    brand: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    description: { type: String, trim: true },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    mrp: { type: Number, min: [0, 'MRP cannot be negative'] },
    prescriptionRequired: { type: Boolean, default: false },
    stock: { type: Number, default: 0, min: [0, 'Stock cannot be negative'] },
    category: { type: String, trim: true },
    dosageForm: {
      type: String,
      enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'other'],
    },
    dosageStrength: { type: String, trim: true },
    sideEffects: { type: String, trim: true },
    imageUrl: String,
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

medicineSchema.index({ name: 'text', genericName: 'text' });
medicineSchema.index({ category: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);