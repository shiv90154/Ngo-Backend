const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  description: String,
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'live', 'ended', 'cancelled'], default: 'scheduled' },
  meetingId: { type: String, unique: true, sparse: true },        // 第三方服务返回的房间ID
  meetingPassword: String,
  recordingUrl: String,
  maxParticipants: { type: Number, default: 100 },
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LiveClass', liveClassSchema);