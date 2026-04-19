const mongoose = require('mongoose');

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    workingDays: {
      type: [String],
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
    timeSlots: [
      {
        day: { type: String, required: true }, // 'monday', etc.
        startTime: { type: String, required: true }, // "09:00"
        endTime: { type: String, required: true },   // "17:00"
        slotDuration: { type: Number, default: 30 }, // minutes
        breakTimes: [
          {
            start: String,
            end: String,
          },
        ],
        maxAppointmentsPerSlot: { type: Number, default: 1 },
      },
    ],
    unavailableDates: [
      {
        date: Date,
        reason: String,
      },
    ],
    consultationModes: {
      video: { type: Boolean, default: true },
      audio: { type: Boolean, default: true },
      chat: { type: Boolean, default: true },
      inPerson: { type: Boolean, default: false },
    },
    isAcceptingAppointments: {
      type: Boolean,
      default: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);