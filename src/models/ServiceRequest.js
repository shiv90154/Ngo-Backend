const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    serviceType: {
      type: String,
      enum: [
        'Education',
        'Healthcare',
        'Finance',
        'Agriculture',
        'IT',
        'Social',
        'Media',
        'Ecommerce',
        'Other',
      ],
      required: [true, 'Service type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_review', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    attachments: [
      {
        fileUrl: String,
        fileName: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ user: 1, createdAt: -1 });
serviceRequestSchema.index({ status: 1 });
serviceRequestSchema.index({ serviceType: 1 });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);