const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'इवेंट का शीर्षक आवश्यक है'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    eventDate: {
      type: Date,
      required: true
    },
    location: {
      type: String,
      trim: true
    },
    maxParticipants: {
      type: Number,
      min: 1
    },
    registeredCount: {
      type: Number,
      default: 0
    },
    // Participants array (user references)
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // Scope fields
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    block: { type: String, trim: true },
    village: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
  },
  { timestamps: true }
);

eventSchema.index({ eventDate: 1 });
eventSchema.index({ state: 1 });

module.exports = mongoose.model('Event', eventSchema);