const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    organization: { type: String, required: true },
    description: String,
    location: String,
    startDate: Date,
    endDate: Date,
    stipend: Number,
    applyLink: String,
    isActive: { type: Boolean, default: true },
    // Scope fields (same as Expense)
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    block: { type: String, trim: true },
    village: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

internshipSchema.index({ isActive: 1 });
internshipSchema.index({ state: 1, district: 1 });

module.exports = mongoose.model('Internship', internshipSchema);