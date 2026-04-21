const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  description: String,
  duration: { type: Number, required: true },       // minutes
  totalMarks: { type: Number, required: true },
  passingMarks: { type: Number, required: true },
  isPublished: { type: Boolean, default: false },
  startTime: Date,
  endTime: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Test', testSchema);