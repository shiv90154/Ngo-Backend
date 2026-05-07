const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  eventDate: { type: Date, required: true },
  venue: { type: String, trim: true },
  type: { type: String, enum: ['health_camp', 'blood_donation', 'awareness', 'training', 'other'], default: 'other' },
  isPaid: { type: Boolean, default: false },
  registrationFee: { type: Number, default: 0 },
  image: String,
  maxParticipants: { type: Number, default: 0 },  // 0 = unlimited
  registeredCount: { type: Number, default: 0 },
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);