const mongoose = require('mongoose');

const testAttemptSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOption: Number
  }],
  score: Number,
  percentage: Number,
  passed: Boolean,
  startedAt: Date,
  submittedAt: Date,
  certificateUrl: String
});

module.exports = mongoose.model('TestAttempt', testAttemptSchema);