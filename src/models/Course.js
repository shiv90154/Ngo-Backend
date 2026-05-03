const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  thumbnail: String,
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, default: 0 },                       // 0 = free
  subscriptionRequired: { type: Boolean, default: false },   // 需要订阅
  category: { type: String, enum: ['UPSC', 'Banking', 'Agriculture', 'School', 'Skill'] },
  language: { type: String, default: 'English' },
  isPublished: { type: Boolean, default: false },
  totalEnrolled: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);