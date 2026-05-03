const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  progress: { type: Number, default: 0 },
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  enrolledAt: { type: Date, default: Date.now },
  completedAt: Date,
  certificateIssued: { type: Boolean, default: false }
});

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
module.exports = mongoose.model('Enrollment', enrollmentSchema);