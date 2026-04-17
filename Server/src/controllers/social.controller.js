const Post = require('../models/Post.model');
const Follow = require('../models/Follow.model');
const Notification = require('../models/Notification.model');
const User = require('../models/user.model');

// CREATE POST
exports.createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const media = req.files ? req.files.map(f => ({ url: `/uploads/social/${f.filename}`, type: 'image' })) : [];
    const post = await Post.create({ author: req.user.id, content, media });
    const populated = await Post.findById(post._id).populate('author', 'fullName email profileImage');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET FEED (posts from followed users + own)
exports.getFeed = async (req, res) => {
  try {
    const following = await Follow.find({ follower: req.user.id }).select('following');
    const followingIds = following.map(f => f.following);
    followingIds.push(req.user.id);
    const posts = await Post.find({ author: { $in: followingIds }, isPublished: true })
      .populate('author', 'fullName email profileImage')
      .populate('comments.user', 'fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET USER POSTS
exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId, isPublished: true })
      .populate('author', 'fullName email profileImage')
      .populate('comments.user', 'fullName profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// LIKE POST
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.likes.includes(req.user.id)) return res.status(400).json({ success: false, message: 'Already liked' });
    post.likes.push(req.user.id);
    await post.save();
    if (post.author.toString() !== req.user.id) {
      await Notification.create({ user: post.author, type: 'like', fromUser: req.user.id, postId: post._id });
    }
    res.json({ success: true, data: { likes: post.likes.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UNLIKE POST
exports.unlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    post.likes = post.likes.filter(id => id.toString() !== req.user.id);
    await post.save();
    res.json({ success: true, data: { likes: post.likes.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADD COMMENT
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    post.comments.push({ user: req.user.id, text, createdAt: new Date() });
    await post.save();
    const populated = await Post.findById(post._id).populate('comments.user', 'fullName profileImage');
    if (post.author.toString() !== req.user.id) {
      await Notification.create({ user: post.author, type: 'comment', fromUser: req.user.id, postId: post._id });
    }
    res.json({ success: true, data: populated.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE COMMENT
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    post.comments = post.comments.filter(c => c._id.toString() !== req.params.commentId);
    await post.save();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SHARE POST
exports.sharePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (!post.shares.includes(req.user.id)) {
      post.shares.push(req.user.id);
      await post.save();
    }
    // Optionally create a new "shared post" entry (simpler: just increment share count)
    res.json({ success: true, message: 'Post shared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// FOLLOW USER
exports.followUser = async (req, res) => {
  try {
    if (req.params.userId === req.user.id) return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    const existing = await Follow.findOne({ follower: req.user.id, following: req.params.userId });
    if (existing) return res.status(400).json({ success: false, message: 'Already following' });
    await Follow.create({ follower: req.user.id, following: req.params.userId });
    await Notification.create({ user: req.params.userId, type: 'follow', fromUser: req.user.id });
    res.json({ success: true, message: 'Followed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UNFOLLOW
exports.unfollowUser = async (req, res) => {
  try {
    await Follow.findOneAndDelete({ follower: req.user.id, following: req.params.userId });
    res.json({ success: true, message: 'Unfollowed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET FOLLOWERS
exports.getFollowers = async (req, res) => {
  try {
    const followers = await Follow.find({ following: req.params.userId }).populate('follower', 'fullName email profileImage');
    res.json({ success: true, data: followers.map(f => f.follower) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET FOLLOWING
exports.getFollowing = async (req, res) => {
  try {
    const following = await Follow.find({ follower: req.params.userId }).populate('following', 'fullName email profileImage');
    res.json({ success: true, data: following.map(f => f.following) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET SUGGESTIONS (users not followed)
exports.getSuggestions = async (req, res) => {
  try {
    const following = await Follow.find({ follower: req.user.id }).select('following');
    const followingIds = following.map(f => f.following);
    followingIds.push(req.user.id);
    const suggestions = await User.find({ _id: { $nin: followingIds } })
      .select('fullName email profileImage')
      .limit(10);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET NOTIFICATIONS
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate('fromUser', 'fullName profileImage')
      .populate('postId', 'content')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// MARK NOTIFICATION READ
exports.markNotificationRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.notificationId, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// TRENDING POSTS (last 7 days, by likes+comments)
exports.getTrendingPosts = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const posts = await Post.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, isPublished: true } },
      { $addFields: { engagement: { $add: [{ $size: '$likes' }, { $size: '$comments' }] } } },
      { $sort: { engagement: -1 } },
      { $limit: 10 },
    ]);
    const populated = await Post.populate(posts, [
      { path: 'author', select: 'fullName email profileImage' },
      { path: 'comments.user', select: 'fullName profileImage' },
    ]);
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPLOAD MEDIA
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    res.json({ success: true, data: { url: `/uploads/social/${req.file.filename}` } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE POST
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });
    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};