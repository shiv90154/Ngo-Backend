// models/ServiceRequest.js
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
      required: [true, 'Service type is required'],
      trim: true,
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
    contactNumber: {               // 🆕 Contact number
      type: String,
      trim: true,
      default: '',
    },
    isUrgent: {                    // 🆕 Urgent flag
      type: Boolean,
      default: false,
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