const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    startDate: Date,
    endDate: Date,
    budget: Number,
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
      default: 'planning',
    },
    team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true }
);

projectSchema.index({ createdBy: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ status: 1 });

module.exports = mongoose.model('Project', projectSchema);