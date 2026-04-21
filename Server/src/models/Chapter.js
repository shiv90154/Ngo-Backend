const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  order: { type: Number, required: true },
  isFree: { type: Boolean, default: false }
});

module.exports = mongoose.model('Chapter', chapterSchema);