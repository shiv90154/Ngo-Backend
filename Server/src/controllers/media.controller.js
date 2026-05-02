const MediaPost = require('../models/MediaPost');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const User = require('../models/user.model');
const Notification = require('../models/Notification');
const AdCampaign = require('../models/AdCampaign');
const AdEvent = require('../models/AdEvent');
const path = require('path');
const fs = require('fs').promises;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/media');
(async () => {
  await fs.mkdir(uploadDir, { recursive: true });
})();

// ---------- HELPERS ----------
const deleteFile = async (filePath) => {
  const fullPath = path.join(__dirname, '..', filePath);
  try {
    await fs.unlink(fullPath);
  } catch (err) {
    // File already deleted or doesn't exist – ignore
  }
};

const createNotification = async ({ recipient, sender, type, post, comment }) => {
  try {
    if (recipient.toString() === sender.toString()) return;
    await Notification.create({ recipient, sender, type, post, comment });
  } catch (error) {
    console.error('Notification creation failed:', error);
  }
};

const addLikeStatus = async (posts, userId) => {
  if (!posts.length) return;
  const postIds = posts.map(p => p._id);
  const likedPosts = await Like.find({ post: { $in: postIds }, user: userId }).select('post');
  const likedSet = new Set(likedPosts.map(l => l.post.toString()));
  posts.forEach(p => (p.isLiked = likedSet.has(p._id.toString())));
};

const transformAdToPost = (ad) => ({
  _id: `ad_${ad._id}`,
  adId: ad._id.toString(),
  isAd: true,
  businessName: ad.businessName,
  content: ad.content,
  media: ad.media || [],
  ctaText: ad.ctaText || 'Learn More',
  targetUrl: ad.targetUrl,
  createdAt: ad.createdAt,
  author: {
    _id: ad.advertiserId,
    fullName: ad.businessName,
    profileImage: null
  },
  likesCount: 0,
  commentsCount: 0,
  isLiked: false,
  tags: [],
  updatedAt: ad.createdAt
});

// Unified function to get ad for feed (used by both media and ad controllers)
const getAdForFeed = async (userId, userRole, userState, userDistrict, userBlock) => {
  try {
    const now = new Date();
    const user = await User.findById(userId);
    if (!user) return null;

    // Check daily ad limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAdViews = await AdEvent.countDocuments({
      userId: user._id,
      eventType: 'impression',
      createdAt: { $gte: today }
    });

    const maxAdsPerDay = user.adPreferences?.maxAdsPerDay || 10;
    if (todayAdViews >= maxAdsPerDay) return null;

    // Filter out recently seen ads (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentAdViews = await AdEvent.find({
      userId: user._id,
      eventType: 'impression',
      createdAt: { $gte: twoHoursAgo }
    }).distinct('campaignId');

    // Build targeting query
    const targetQuery = {
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
      _id: { $nin: recentAdViews },
      $or: [
        { 'targetAudience.allUsers': true },
        ...(userState && userDistrict && userBlock ? [{
          $and: [
            { 'targetAudience.states': { $in: [userState] } },
            { 'targetAudience.districts': { $in: [userDistrict] } },
            { 'targetAudience.blocks': { $in: [userBlock] } }
          ]
        }] : [])
      ]
    };
    // Weighted random selection based on bid amount
    const campaigns = await AdCampaign.find(targetQuery).lean();
    if (!campaigns.length) return null;

    const totalBid = campaigns.reduce((sum, c) => sum + (c.bidAmount || 0), 0);
    let random = Math.random() * totalBid;
    let selectedCampaign = null;

    for (const campaign of campaigns) {
      if (random < (campaign.bidAmount || 0)) {
        selectedCampaign = campaign;
        break;
      }
      random -= (campaign.bidAmount || 0);
    }
    if (!selectedCampaign) selectedCampaign = campaigns[0];

    // Track impression asynchronously
    Promise.all([
      AdEvent.create({
        campaignId: selectedCampaign._id,
        userId: userId,
        eventType: 'impression',
        metadata: {
          userLocation: { state: userState || 'unknown', district: userDistrict || 'unknown', block: userBlock || 'unknown' },
          userRole: userRole,
        }
      }),
      AdCampaign.findByIdAndUpdate(selectedCampaign._id, { $inc: { impressions: 1 } }),
      User.findByIdAndUpdate(userId, {
        $push: { adsSeen: { campaignId: selectedCampaign._id, seenAt: new Date() } }
      })
    ]).catch(err => console.error('Failed to track impression:', err));
    console.log("getting ad")

    return selectedCampaign;
  } catch (error) {
    console.error('Error in getAdForFeed:', error);
    return null;
  }
};

// ---------- POST CRUD ----------
exports.createPost = async (req, res) => {
  try {
    const { content, tags, location } = req.body;
    const author = req.user.id;

    const user = await User.findById(author);
    if (!user?.mediaCreatorProfile?.isCreator) {
      return res.status(403).json({ success: false, message: 'You are not a media creator' });
    }

    const media = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const type = file.mimetype.startsWith('image/') ? 'image' : 'video';
        media.push({ type, url: `/uploads/media/${file.filename}` });
      }
    }

    const post = await MediaPost.create({
      author,
      content,
      media,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      location,
    });

    await User.findByIdAndUpdate(author, { $inc: { 'mediaCreatorProfile.totalPosts': 1 } });
    const populated = await post.populate('author', 'fullName profileImage mediaCreatorProfile');
    res.status(201).json({ success: true, post: populated });
  } catch (error) {
    if (req.files) {
      for (const file of req.files) await deleteFile(file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPost = async (req, res) => {
  try {
    const post = await MediaPost.findById(req.params.id)
      .populate('author', 'fullName profileImage mediaCreatorProfile')
      .lean();
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const like = await Like.findOne({ post: post._id, user: req.user.id });
    post.isLiked = !!like;
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const post = await MediaPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.author.toString() !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { content, tags, location } = req.body;
    if (content !== undefined) post.content = content;
    if (tags !== undefined) post.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (location !== undefined) post.location = location;

    await post.save();
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await MediaPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.author.toString() !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    for (const media of post.media) await deleteFile(media.url);
    await Like.deleteMany({ post: post._id });
    await Comment.deleteMany({ post: post._id });
    await Notification.deleteMany({ post: post._id });
    await User.findByIdAndUpdate(post.author, { $inc: { 'mediaCreatorProfile.totalPosts': -1 } });
    await post.deleteOne();

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      MediaPost.find({ author: userId })
        .populate('author', 'fullName profileImage mediaCreatorProfile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      MediaPost.countDocuments({ author: userId }),
    ]);

    await addLikeStatus(posts, req.user.id);
    res.json({ success: true, posts, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.getCreatorProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select(
        'fullName email phone profileImage socialProfile mediaCreatorProfile state district block village createdAt'
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
// ---------- FEED ----------
exports.getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const skip = (page - 1) * limit;

    const following = await Follow.find({ follower: userId }).select('following').lean();
    const followingIds = following.map(f => f.following);
    followingIds.push(userId);

    const [posts, total] = await Promise.all([
      MediaPost.find({ author: { $in: followingIds } })
        .populate('author', 'fullName profileImage mediaCreatorProfile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      MediaPost.countDocuments({ author: { $in: followingIds } }),
    ]);

    await addLikeStatus(posts, userId);

    let finalPosts = [...posts];
    if (parseInt(page) === 1 && posts.length >= 2) {
      const ad = await getAdForFeed(userId, req.user.role, req.user.state, req.user.district, req.user.block);
      if (ad) {
        const transformedAd = transformAdToPost(ad);
        const insertPosition = Math.min(2, finalPosts.length);
        finalPosts.splice(insertPosition, 0, transformedAd);
      }
    }

    res.json({ success: true, posts: finalPosts, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- LIKES ----------
exports.likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const post = await MediaPost.findById(postId).populate('author');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const existing = await Like.findOne({ post: postId, user: userId });
    if (existing) return res.status(400).json({ success: false, message: 'Already liked' });

    await Like.create({ post: postId, user: userId });
    post.likesCount += 1;
    await post.save();

    await createNotification({ recipient: post.author._id, sender: userId, type: 'like', post: postId });
    res.json({ success: true, likesCount: post.likesCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.unlikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const post = await MediaPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const result = await Like.deleteOne({ post: postId, user: userId });
    if (result.deletedCount === 0) return res.status(400).json({ success: false, message: 'Not liked yet' });

    post.likesCount = Math.max(0, post.likesCount - 1);
    await post.save();
    res.json({ success: true, likesCount: post.likesCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- COMMENTS ----------
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user.id;
    if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Comment text required' });

    const post = await MediaPost.findById(postId).populate('author');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = await Comment.create({ post: postId, user: userId, text: text.trim() });
    post.commentsCount += 1;
    await post.save();

    await createNotification({ recipient: post.author._id, sender: userId, type: 'comment', post: postId, comment: comment._id });
    await comment.populate('user', 'fullName profileImage');
    res.status(201).json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const post = await MediaPost.findById(comment.post);
    const isAuthorized = req.user.id === comment.user.toString() || req.user.id === post?.author.toString() || req.user.role === 'SUPER_ADMIN';
    if (!isAuthorized) return res.status(403).json({ success: false, message: 'Not authorized' });

    await comment.deleteOne();
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      Comment.find({ post: id }).populate('user', 'fullName profileImage').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Comment.countDocuments({ post: id }),
    ]);

    res.json({ success: true, comments, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- FOLLOW SYSTEM ----------
exports.followUser = async (req, res) => {
  try {
    const targetId = req.params.userId;
    const followerId = req.user.id;
    if (targetId === followerId) return res.status(400).json({ success: false, message: 'Cannot follow yourself' });

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    const existing = await Follow.findOne({ follower: followerId, following: targetId });
    if (existing) return res.status(400).json({ success: false, message: 'Already following' });

    await Follow.create({ follower: followerId, following: targetId });
    await User.findByIdAndUpdate(followerId, { $inc: { 'mediaCreatorProfile.totalFollowing': 1 } });
    await User.findByIdAndUpdate(targetId, { $inc: { 'mediaCreatorProfile.totalFollowers': 1 } });
    await createNotification({ recipient: targetId, sender: followerId, type: 'follow' });

    res.json({ success: true, message: 'Followed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const targetId = req.params.userId;
    const followerId = req.user.id;
    const result = await Follow.deleteOne({ follower: followerId, following: targetId });
    if (result.deletedCount === 0) return res.status(400).json({ success: false, message: 'Not following' });

    await User.findByIdAndUpdate(followerId, { $inc: { 'mediaCreatorProfile.totalFollowing': -1 } });
    await User.findByIdAndUpdate(targetId, { $inc: { 'mediaCreatorProfile.totalFollowers': -1 } });
    res.json({ success: true, message: 'Unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      Follow.find({ following: userId }).populate('follower', 'fullName profileImage mediaCreatorProfile').skip(skip).limit(Number(limit)).lean(),
      Follow.countDocuments({ following: userId }),
    ]);

    res.json({ success: true, followers: follows.map(f => f.follower), totalPages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      Follow.find({ follower: userId }).populate('following', 'fullName profileImage mediaCreatorProfile').skip(skip).limit(Number(limit)).lean(),
      Follow.countDocuments({ follower: userId }),
    ]);

    res.json({ success: true, following: follows.map(f => f.following), totalPages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.checkFollowStatus = async (req, res) => {
  try {
    const targetId = req.params.userId;
    const currentUserId = req.user.id;
    const follow = await Follow.findOne({ follower: currentUserId, following: targetId });
    res.json({ success: true, isFollowing: !!follow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- SEARCH & CREATOR MANAGEMENT ----------
exports.searchCreators = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    let filter = { 'mediaCreatorProfile.isCreator': true };
    if (q && q.trim()) {
      filter.$or = [{ fullName: { $regex: q.trim(), $options: 'i' } }, { email: { $regex: q.trim(), $options: 'i' } }];
    }
    const sort = q ? {} : { 'mediaCreatorProfile.totalFollowers': -1 };
    const [users, total] = await Promise.all([
      User.find(filter).select('fullName profileImage mediaCreatorProfile').sort(sort).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, users, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.becomeCreator = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.mediaCreatorProfile?.isCreator) return res.status(400).json({ success: false, message: 'Already a creator' });

    user.mediaCreatorProfile = { ...user.mediaCreatorProfile, isCreator: true, creatorStatus: 'approved' };
    await user.save();
    res.json({ success: true, message: 'You are now a media creator!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- AD TRACKING (Simplified - now uses unified getAdForFeed) ----------
exports.trackAdClick = async (req, res) => {
  try {
    const { campaignId } = req.body;
    const userId = req.user.id;

    const campaign = await AdCampaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    campaign.clicks += 1;
    campaign.spentBudget += campaign.bidAmount;
    await campaign.save();

    await AdEvent.create({
      campaignId,
      userId,
      eventType: 'click',
      metadata: { userLocation: { state: req.user.state, district: req.user.district }, userRole: req.user.role }
    });

    await User.findByIdAndUpdate(userId, { $push: { adsSeen: { campaignId, clicked: true, clickedAt: new Date() } } });
    res.json({ success: true, message: 'Click tracked', targetUrl: campaign.targetUrl });
  } catch (error) {
    console.error('Track ad click error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Export the helper for use in ad controller
exports._getAdForFeed = getAdForFeed;
exports._transformAdToPost = transformAdToPost;
