const MediaPost = require('../models/MediaPost');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const User = require('../models/user.model');
const Notification = require('../models/Notification'); // 🆕 imported
const path = require('path');
const fs = require('fs').promises;

const uploadDir = path.join(__dirname, '../uploads/media');
(async () => {
  await fs.mkdir(uploadDir, { recursive: true });
})();

// 🆕 Helper: Create a notification (silent fail – won't break the main operation)
const createNotification = async ({ recipient, sender, type, post, comment }) => {
  try {
    // Don't notify if sender is the recipient
    if (recipient.toString() === sender.toString()) return;

    await Notification.create({
      recipient,
      sender,
      type,
      post,
      comment,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

// ======================
// POST CRUD
// ======================

// Create a post (with media files)
exports.createPost = async (req, res) => {
  try {
    const { content, tags, location } = req.body;
    const author = req.user.id;

    // Check if user is a media creator
    const user = await User.findById(author);
    if (!user.mediaCreatorProfile?.isCreator) {
      return res.status(403).json({ success: false, message: 'You are not a media creator' });
    }

    const media = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
        media.push({
          type: fileType,
          url: `/uploads/media/${file.filename}`,
        });
      }
    }

    const post = await MediaPost.create({
      author,
      content,
      media,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      location,
    });

    // Update user's post count
    await User.findByIdAndUpdate(author, {
      $inc: { 'mediaCreatorProfile.totalPosts': 1 },
      $push: { mediaPosts: post._id },
    });

    await post.populate('author', 'fullName profileImage mediaCreatorProfile');

    res.status(201).json({ success: true, post });
  } catch (error) {
    // Cleanup uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {});
      }
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get a single post by ID
exports.getPost = async (req, res) => {
  try {
    const post = await MediaPost.findById(req.params.id)
      .populate('author', 'fullName profileImage mediaCreatorProfile')
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if current user liked this post
    const like = await Like.findOne({ post: post._id, user: req.user.id });
    post.isLiked = !!like;

    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update a post
exports.updatePost = async (req, res) => {
  try {
    const { content, tags, location } = req.body;
    const post = await MediaPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Authorization
    if (post.author.toString() !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (content !== undefined) post.content = content;
    if (tags !== undefined) post.tags = tags.split(',').map(t => t.trim());
    if (location !== undefined) post.location = location;

    await post.save();
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    const post = await MediaPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Authorization
    if (post.author.toString() !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete media files
    for (const media of post.media) {
      const filePath = path.join(__dirname, '..', media.url);
      await fs.unlink(filePath).catch(() => {});
    }

    // Delete associated likes and comments
    await Like.deleteMany({ post: post._id });
    await Comment.deleteMany({ post: post._id });
    // 🆕 Delete related notifications
    await Notification.deleteMany({ post: post._id });

    // Update user's post count
    await User.findByIdAndUpdate(post.author, {
      $inc: { 'mediaCreatorProfile.totalPosts': -1 },
      $pull: { mediaPosts: post._id },
    });

    await post.deleteOne();

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get posts by a specific user
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const posts = await MediaPost.find({ author: userId, isPublished: true })
      .populate('author', 'fullName profileImage mediaCreatorProfile')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Add isLiked flag for each post
    for (const post of posts) {
      const like = await Like.findOne({ post: post._id, user: req.user.id });
      post.isLiked = !!like;
    }

    const total = await MediaPost.countDocuments({ author: userId, isPublished: true });

    res.json({
      success: true,
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// FEED (for current user)
// ======================
exports.getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id;

    // Get list of users the current user follows
    const following = await Follow.find({ follower: userId }).select('following');
    const followingIds = following.map(f => f.following);
    // Include user's own posts in feed
    followingIds.push(userId);

    const posts = await MediaPost.find({ author: { $in: followingIds }, isPublished: true })
      .populate('author', 'fullName profileImage mediaCreatorProfile')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Add isLiked flag
    for (const post of posts) {
      const like = await Like.findOne({ post: post._id, user: userId });
      post.isLiked = !!like;
    }

    const total = await MediaPost.countDocuments({ author: { $in: followingIds }, isPublished: true });

    res.json({
      success: true,
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// LIKES
// ======================

// Like a post
exports.likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await MediaPost.findById(postId).populate('author');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const existingLike = await Like.findOne({ post: postId, user: userId });
    if (existingLike) {
      return res.status(400).json({ success: false, message: 'Already liked' });
    }

    await Like.create({ post: postId, user: userId });
    post.likesCount += 1;
    await post.save();

    // 🆕 Create notification for post author
    await createNotification({
      recipient: post.author._id,
      sender: userId,
      type: 'like',
      post: postId,
    });

    res.json({ success: true, likesCount: post.likesCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Unlike a post
exports.unlikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await MediaPost.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const result = await Like.deleteOne({ post: postId, user: userId });
    if (result.deletedCount === 0) {
      return res.status(400).json({ success: false, message: 'Not liked yet' });
    }

    post.likesCount = Math.max(0, post.likesCount - 1);
    await post.save();

    res.json({ success: true, likesCount: post.likesCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// COMMENTS
// ======================

// Add comment
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user.id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const post = await MediaPost.findById(postId).populate('author');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = await Comment.create({
      post: postId,
      user: userId,
      text: text.trim(),
    });

    post.commentsCount += 1;
    await post.save();

    // 🆕 Create notification for post author
    await createNotification({
      recipient: post.author._id,
      sender: userId,
      type: 'comment',
      post: postId,
      comment: comment._id,
    });

    await comment.populate('user', 'fullName profileImage');

    res.status(201).json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Authorization: comment author or post author or admin
    const post = await MediaPost.findById(comment.post);
    const isAuthorized = req.user.id === comment.user.toString() ||
                         req.user.id === post.author.toString() ||
                         req.user.role === 'SUPER_ADMIN';

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await comment.deleteOne();

    post.commentsCount = Math.max(0, post.commentsCount - 1);
    await post.save();

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get comments for a post
exports.getComments = async (req, res) => {
  try {
    const postId = req.params.id;
    const { page = 1, limit = 20 } = req.query;

    const comments = await Comment.find({ post: postId })
      .populate('user', 'fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Comment.countDocuments({ post: postId });

    res.json({
      success: true,
      comments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// FOLLOW SYSTEM
// ======================

// Follow a user
exports.followUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const followerId = req.user.id;

    if (targetUserId === followerId) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const existingFollow = await Follow.findOne({ follower: followerId, following: targetUserId });
    if (existingFollow) {
      return res.status(400).json({ success: false, message: 'Already following' });
    }

    await Follow.create({ follower: followerId, following: targetUserId });

    // Update follower counts in both users' mediaCreatorProfile
    await User.findByIdAndUpdate(followerId, {
      $inc: { 'mediaCreatorProfile.totalFollowing': 1 },
    });
    await User.findByIdAndUpdate(targetUserId, {
      $inc: { 'mediaCreatorProfile.totalFollowers': 1 },
    });

    // 🆕 Create notification for the user being followed
    await createNotification({
      recipient: targetUserId,
      sender: followerId,
      type: 'follow',
    });

    res.json({ success: true, message: 'Followed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Unfollow a user
exports.unfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const followerId = req.user.id;

    const result = await Follow.deleteOne({ follower: followerId, following: targetUserId });
    if (result.deletedCount === 0) {
      return res.status(400).json({ success: false, message: 'Not following' });
    }

    await User.findByIdAndUpdate(followerId, {
      $inc: { 'mediaCreatorProfile.totalFollowing': -1 },
    });
    await User.findByIdAndUpdate(targetUserId, {
      $inc: { 'mediaCreatorProfile.totalFollowers': -1 },
    });

    res.json({ success: true, message: 'Unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get followers list
exports.getFollowers = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const follows = await Follow.find({ following: userId })
      .populate('follower', 'fullName profileImage mediaCreatorProfile')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Follow.countDocuments({ following: userId });

    res.json({
      success: true,
      followers: follows.map(f => f.follower),
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get following list
exports.getFollowing = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const follows = await Follow.find({ follower: userId })
      .populate('following', 'fullName profileImage mediaCreatorProfile')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Follow.countDocuments({ follower: userId });

    res.json({
      success: true,
      following: follows.map(f => f.following),
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// src/controllers/media.controller.js
exports.searchCreators = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const query = { 'mediaCreatorProfile.isCreator': true };
    
    if (q && q.trim()) {
      query.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    
    // 构建排序：有查询词时按相关性（这里简化为默认排序），无查询词时按粉丝数降序
    const sort = q && q.trim() ? {} : { 'mediaCreatorProfile.totalFollowers': -1 };
    
    const users = await User.find(query)
      .select('fullName profileImage mediaCreatorProfile')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);
    res.json({
      success: true,
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// Check if current user follows another user
exports.checkFollowStatus = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const followerId = req.user.id;

    const follow = await Follow.findOne({ follower: followerId, following: targetUserId });
    res.json({ success: true, isFollowing: !!follow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Search users/creators
exports.searchCreators = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query required' });
    }

    const users = await User.find({
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
      'mediaCreatorProfile.isCreator': true,
    })
      .select('fullName profileImage mediaCreatorProfile')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments({
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
      'mediaCreatorProfile.isCreator': true,
    });

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Toggle media creator status (for user to become creator)
exports.becomeCreator = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.mediaCreatorProfile?.isCreator) {
      return res.status(400).json({ success: false, message: 'Already a creator' });
    }

    user.mediaCreatorProfile = {
      ...user.mediaCreatorProfile,
      isCreator: true,
      creatorStatus: 'approved', // auto-approve for now; can be 'pending' if admin approval needed
      totalPosts: 0,
      totalFollowers: 0,
      totalFollowing: 0,
      monetizationEarnings: 0,
    };
    await user.save();

    res.json({ success: true, message: 'You are now a media creator!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};