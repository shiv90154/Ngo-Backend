const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor ID is required'],
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    timeSlot: {
      start: { type: String, required: true }, // e.g., "10:00 AM"
      end: { type: String, required: true },   // e.g., "10:30 AM"
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
      default: 'pending',
    },
    consultationType: {
      type: String,
      enum: ['video', 'audio', 'chat', 'in-person'],
      default: 'video',
    },
    symptoms: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    payment: {
      amount: { type: Number, required: true },
      status: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
      transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
      paymentMethod: String,
    },
    meetingLink: {
      type: String, // For video consultations
    },
    roomId: {
      type: String, // Chat/Video room identifier
    },
    cancellationReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    followUpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes for faster queries
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ 'payment.status': 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);