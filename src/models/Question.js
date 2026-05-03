const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  questionText: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: Number, required: true },   // index of correct option (0-based)
  marks: { type: Number, default: 1 },
  explanation: String
});

module.exports = mongoose.model('Question', questionSchema);