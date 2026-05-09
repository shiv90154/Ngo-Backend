// backend/src/controllers/newsController.js
const News = require('../models/News');
const asyncHandler = require('express-async-handler');

// @desc    Create a news article
// @route   POST /api/news
// @access  Private (NEWS_EDITOR / SUPER_ADMIN)
const createNews = asyncHandler(async (req, res) => {
  const { title, content, category, isBreakingNews, tags } = req.body;
  const image = req.file ? `/uploads/news/${req.file.filename}` : null;

  const news = await News.create({
    title,
    content,
    category,
    image,
    author: req.user._id,
    isBreakingNews: isBreakingNews || false,
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    isPublished: req.body.isPublished === 'true' || req.body.isPublished === true,
    publishedAt: req.body.isPublished ? new Date() : null,
  });

  res.status(201).json({ success: true, data: news });
});

// @desc    Get all published news (public)
// @route   GET /api/news
// @access  Public
const getNews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, breaking } = req.query;
  const filter = { isPublished: true };

  if (category) filter.category = category;
  if (breaking === 'true') filter.isBreakingNews = true;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [news, total] = await Promise.all([
    News.find(filter)
      .populate('author', 'fullName profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    News.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: news,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// @desc    Get single news by ID
// @route   GET /api/news/:id
// @access  Public
const getNewsById = asyncHandler(async (req, res) => {
  const news = await News.findById(req.params.id).populate('author', 'fullName profileImage');
  if (!news || !news.isPublished) {
    res.status(404);
    throw new Error('News not found or not published');
  }
  // Increment views
  news.views += 1;
  await news.save();
  res.json({ success: true, data: news });
});

// @desc    Update news (editor/admin)
// @route   PUT /api/news/:id
// @access  Private (NEWS_EDITOR / SUPER_ADMIN)
const updateNews = asyncHandler(async (req, res) => {
  const news = await News.findById(req.params.id);
  if (!news) {
    res.status(404);
    throw new Error('News not found');
  }

  const { title, content, category, isBreakingNews, tags, isPublished } = req.body;
  if (title) news.title = title;
  if (content) news.content = content;
  if (category) news.category = category;
  if (isBreakingNews !== undefined) news.isBreakingNews = isBreakingNews;
  if (tags) news.tags = tags.split(',').map(t => t.trim());
  if (req.file) news.image = `/uploads/news/${req.file.filename}`;
  if (isPublished !== undefined) {
    news.isPublished = isPublished === 'true' || isPublished === true;
    if (news.isPublished && !news.publishedAt) news.publishedAt = new Date();
  }

  const updatedNews = await news.save();
  res.json({ success: true, data: updatedNews });
});

// @desc    Delete news
// @route   DELETE /api/news/:id
// @access  Private (NEWS_EDITOR / SUPER_ADMIN)
const deleteNews = asyncHandler(async (req, res) => {
  const news = await News.findById(req.params.id);
  if (!news) {
    res.status(404);
    throw new Error('News not found');
  }
  await news.deleteOne();
  res.json({ success: true, message: 'News deleted successfully' });
});

module.exports = { createNews, getNews, getNewsById, updateNews, deleteNews };