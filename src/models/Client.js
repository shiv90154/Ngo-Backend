const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true },
    company: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 负责人
    status: { type: String, enum: ['active', 'inactive', 'lead'], default: 'lead' },
    notes: String,
  },
  { timestamps: true }
);

clientSchema.index({ createdBy: 1 });
clientSchema.index({ assignedTo: 1 });
clientSchema.index({ name: 'text', email: 'text', company: 'text' });

module.exports = mongoose.model('Client', clientSchema);