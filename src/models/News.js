// backend/src/models/News.js
const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'News title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'News content is required'],
    },
    category: {
      type: String,
      enum: ['national', 'state', 'district', 'sports', 'education', 'health', 'agriculture', 'technology', 'other'],
      default: 'national',
    },
    image: {
      type: String, // URL (stored via multer)
      default: null,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isBreakingNews: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    views: { type: Number, default: 0 },
    publishedAt: Date,
  },
  { timestamps: true }
);

newsSchema.index({ isPublished: 1, isBreakingNews: 1 });
newsSchema.index({ category: 1, isPublished: 1 });
newsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('News', newsSchema);