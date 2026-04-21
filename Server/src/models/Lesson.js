const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'pdf', 'quiz'], default: 'video' },
  content: {
    videoUrl: String,
    pdfUrl: String,
    duration: Number                 // in minutes
  },
  order: { type: Number, required: true },
  isPreview: { type: Boolean, default: false }
});

module.exports = mongoose.model('Lesson', lessonSchema);