const mongoose = require('mongoose');

const mediaPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: [2000, 'Content cannot exceed 2000 characters'],
    },
    media: [
      {
        type: { type: String, enum: ['image', 'video'], required: true },
        url: { type: String, required: true },
        thumbnail: String, // for videos
      },
    ],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    tags: [String],
    location: String,
  },
  { timestamps: true }
);

// Indexes for feed queries
mediaPostSchema.index({ author: 1, createdAt: -1 });
mediaPostSchema.index({ createdAt: -1 });
mediaPostSchema.index({ tags: 1 });

module.exports = mongoose.model('MediaPost', mediaPostSchema);