const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  certificateNumber: { type: String, unique: true },
  issuedAt: { type: Date, default: Date.now },
  pdfUrl: String,
  verificationCode: String
});

module.exports = mongoose.model('Certificate', certificateSchema);