// controllers/media.controller.js
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
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ---------- HELPER : delete file ----------
const deleteFile = async (filePath) => {
  const fullPath = path.join(__dirname, '..', filePath);
  try {
    await fs.unlink(fullPath);
  } catch (err) {
    // file already gone – ignore
  }
};

// ---------- HELPER : create notification ----------
const createNotification = async ({ recipient, sender, type, post, comment }) => {
  try {
    if (recipient.toString() === sender.toString()) return;
    await Notification.create({ recipient, sender, type, post, comment });
  } catch (error) {
    console.error('Notification creation failed:', error);
  }
};

// ---------- HELPER : add like status to list of posts ----------
const addLikeStatus = async (posts, userId) => {
  if (!posts.length) return;
  const postIds = posts.map(p => p._id);
  const likedPosts = await Like.find({ post: { $in: postIds }, user: userId }).select('post');
  const likedSet = new Set(likedPosts.map(l => l.post.toString()));
  posts.forEach(p => (p.isLiked = likedSet.has(p._id.toString())));
};

// ---------- HELPER : transform an AdCampaign document into a post-like object ----------
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
    profileImage: null,
  },
  likesCount: 0,
  commentsCount: 0,
  isLiked: false,
  tags: [],
  updatedAt: ad.createdAt,
});

// ---------- HELPER : get a random ad for a user (used in feed) ----------
const getAdForFeed = async (userId, user) => {
  try {
    const now = new Date();
    const dbUser = user; // already fetched (or we can re-fetch, but we have the user from auth middleware)

    // daily ad limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAdViews = await AdEvent.countDocuments({
      userId: dbUser._id,
      eventType: 'impression',
      createdAt: { $gte: today },
    });

    const maxAdsPerDay = dbUser.adPreferences?.maxAdsPerDay || 10;
    if (todayAdViews >= maxAdsPerDay) return null;

    // recent ads (last 2 hours) to avoid repetition
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentAdViews = await AdEvent.find({
      userId: dbUser._id,
      eventType: 'impression',
      createdAt: { $gte: twoHoursAgo },
    }).distinct('campaignId');

    // Build targeting query – show ad if:
    //   1) no location/role/module targeting (i.e. empty arrays) → matches everyone
    //   2) or explicitly includes user's location, role, module
    const andConditions = [];
    andConditions.push({ status: 'active', startDate: { $lte: now }, endDate: { $gte: now } });
    andConditions.push({ _id: { $nin: recentAdViews } });

    const userState = dbUser.state;
    const userDistrict = dbUser.district;
    const userBlock = dbUser.block;
    const userRole = dbUser.role;
    const userModules = dbUser.modules || [];

    // Location targeting
    const locationOr = [];
    locationOr.push({ 'targetAudience.locations.states': { $size: 0 } }); // no state filter → all users
    if (userState) {
      locationOr.push({ 'targetAudience.locations.states': { $in: [userState] } });
      if (userDistrict) {
        locationOr.push({
          $and: [
            { 'targetAudience.locations.states': { $in: [userState] } },
            { 'targetAudience.locations.districts': { $in: [userDistrict] } },
          ],
        });
        if (userBlock) {
          locationOr.push({
            $and: [
              { 'targetAudience.locations.states': { $in: [userState] } },
              { 'targetAudience.locations.districts': { $in: [userDistrict] } },
              { 'targetAudience.locations.blocks': { $in: [userBlock] } },
            ],
          });
        }
      }
    }
    andConditions.push({ $or: locationOr });

    // Role targeting
    const roleOr = [];
    roleOr.push({ 'targetAudience.roles': { $size: 0 } }); // no role filter → all
    if (userRole) {
      roleOr.push({ 'targetAudience.roles': { $in: [userRole] } });
    }
    andConditions.push({ $or: roleOr });

    // Module targeting
    const moduleOr = [];
    moduleOr.push({ 'targetAudience.modules': { $size: 0 } }); // no module filter → all
    if (userModules.length) {
      userModules.forEach(mod => {
        moduleOr.push({ 'targetAudience.modules': { $in: [mod] } });
      });
    }
    andConditions.push({ $or: moduleOr });

    // Age / gender are checked after query (for simplicity we do post-filter)
    const campaigns = await AdCampaign.find({ $and: andConditions }).lean();

    // Post-filter by age & gender
    const userAge = dbUser.dob ? new Date().getFullYear() - new Date(dbUser.dob).getFullYear() : null;
    const userGender = dbUser.gender || 'all';

    const eligible = campaigns.filter(c => {
      // age
      if (c.targetAudience.minAge && userAge !== null && userAge < c.targetAudience.minAge) return false;
      if (c.targetAudience.maxAge && userAge !== null && userAge > c.targetAudience.maxAge) return false;
      // gender
      if (c.targetAudience.gender && c.targetAudience.gender !== 'all' && c.targetAudience.gender !== userGender) return false;
      // block check: user has not blocked the advertiser
      if (dbUser.adBlockedCreators && dbUser.adBlockedCreators.some(id => id.equals(c.advertiserId))) return false;
      return true;
    });

    if (!eligible.length) return null;

    // Weighted random selection based on bidAmount
    const totalBid = eligible.reduce((sum, c) => sum + (c.bidAmount || 0), 0);
    let random = Math.random() * totalBid;
    let selectedCampaign = null;
    for (const campaign of eligible) {
      if (random < (campaign.bidAmount || 0)) {
        selectedCampaign = campaign;
        break;
      }
      random -= (campaign.bidAmount || 0);
    }
    if (!selectedCampaign) selectedCampaign = eligible[0];

    // Track impression asynchronously (do not wait)
    Promise.all([
      AdEvent.create({
        campaignId: selectedCampaign._id,
        userId: dbUser._id,
        eventType: 'impression',
        metadata: {
          userLocation: { state: userState, district: userDistrict, block: userBlock },
          userRole,
        },
      }),
      AdCampaign.findByIdAndUpdate(selectedCampaign._id, { $inc: { impressions: 1 } }),
      User.findByIdAndUpdate(dbUser._id, {
        $push: { adsSeen: { campaignId: selectedCampaign._id, seenAt: new Date() } },
      }),
    ]).catch(err => console.error('Impression tracking failed:', err));

    return selectedCampaign;
  } catch (error) {
    console.error('Error in getAdForFeed:', error);
    return null;
  }
};

// ---------- POST CRUD ----------
exports.createPost = catchAsync(async (req, res, next) => {
  const { content, tags, location } = req.body;
  const author = req.user.id;

  const user = await User.findById(author);
  if (!user?.mediaCreatorProfile?.isCreator) {
    throw new AppError('आप एक मीडिया क्रिएटर नहीं हैं', 403);
  }

  const media = (req.files || []).map(file => ({
    type: file.mimetype.startsWith('image/') ? 'image' : 'video',
    url: `/uploads/media/${file.filename}`,
  }));

  const post = await MediaPost.create({
    author,
    content: content || '',
    media,
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    location,
  });

  await User.findByIdAndUpdate(author, { $inc: { 'mediaCreatorProfile.totalPosts': 1 } });
  const populated = await post.populate('author', 'fullName profileImage mediaCreatorProfile');

  res.status(201).json({ success: true, data: populated });
});

exports.getPost = catchAsync(async (req, res, next) => {
  const post = await MediaPost.findById(req.params.id)
    .populate('author', 'fullName profileImage mediaCreatorProfile')
    .lean();
  if (!post) throw new AppError('पोस्ट नहीं मिली', 404);

  const like = await Like.findOne({ post: post._id, user: req.user.id });
  post.isLiked = !!like;
  res.json({ success: true, data: post });
});

exports.updatePost = catchAsync(async (req, res, next) => {
  const post = await MediaPost.findById(req.params.id);
  if (!post) throw new AppError('पोस्ट नहीं मिली', 404);
  if (post.author.toString() !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
    throw new AppError('अनधिकृत', 403);
  }

  const { content, tags, location } = req.body;
  if (content !== undefined) post.content = content;
  if (tags !== undefined) post.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
  if (location !== undefined) post.location = location;

  await post.save();
  res.json({ success: true, data: post });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const post = await MediaPost.findById(req.params.id);
  if (!post) throw new AppError('पोस्ट नहीं मिली', 404);
  if (post.author.toString() !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
    throw new AppError('अनधिकृत', 403);
  }

  for (const media of post.media) await deleteFile(media.url);
  await Like.deleteMany({ post: post._id });
  await Comment.deleteMany({ post: post._id });
  await Notification.deleteMany({ post: post._id });
  await User.findByIdAndUpdate(post.author, { $inc: { 'mediaCreatorProfile.totalPosts': -1 } });
  await post.deleteOne();

  res.json({ success: true, message: 'पोस्ट हटा दी गई' });
});

exports.getUserPosts = catchAsync(async (req, res, next) => {
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
  res.json({
    success: true,
    data: posts,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
  });
});

// ---------- FEED ----------
exports.getFeed = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const userId = req.user.id;
  const skip = (page - 1) * limit;

  const following = await Follow.find({ follower: userId }).select('following').lean();
  const followingIds = following.map(f => f.following);
  followingIds.push(userId); // include own posts

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

  // Insert ad only on first page after 2nd post
  if (Number(page) === 1 && posts.length >= 2) {
    const ad = await getAdForFeed(userId, req.user);
    if (ad) {
      const adPost = transformAdToPost(ad);
      posts.splice(2, 0, adPost);
    }
  }

  res.json({
    success: true,
    data: posts,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
  });
});

// ---------- LIKES ----------
exports.likePost = catchAsync(async (req, res, next) => {
  const postId = req.params.id;
  const userId = req.user.id;

  // Atomic increment to prevent race conditions
  const post = await MediaPost.findById(postId);
  if (!post) throw new AppError('पोस्ट नहीं मिली', 404);

  const existing = await Like.findOne({ post: postId, user: userId });
  if (existing) throw new AppError('पहले से पसंद', 400);

  await Like.create({ post: postId, user: userId });
  const updated = await MediaPost.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } }, { new: true });

  // Notify author if not self
  if (post.author.toString() !== userId) {
    await createNotification({
      recipient: post.author,
      sender: userId,
      type: 'like',
      post: postId,
    });
  }

  res.json({ success: true, likesCount: updated.likesCount });
});

exports.unlikePost = catchAsync(async (req, res, next) => {
  const postId = req.params.id;
  const userId = req.user.id;

  const post = await MediaPost.findById(postId);
  if (!post) throw new AppError('पोस्ट नहीं मिली', 404);

  const result = await Like.deleteOne({ post: postId, user: userId });
  if (result.deletedCount === 0) throw new AppError('पसंद नहीं किया', 400);

  post.likesCount = Math.max(0, post.likesCount - 1);
  await post.save();

  res.json({ success: true, likesCount: post.likesCount });
});

// ---------- COMMENTS ----------
exports.addComment = catchAsync(async (req, res, next) => {
  const { text } = req.body;
  const postId = req.params.id;
  const userId = req.user.id;

  const post = await MediaPost.findById(postId);
  if (!post) throw new AppError('पोस्ट नहीं मिली', 404);

  const comment = await Comment.create({ post: postId, user: userId, text: text.trim() });
  post.commentsCount += 1;
  await post.save();

  // Notify author
  if (post.author.toString() !== userId) {
    await createNotification({
      recipient: post.author,
      sender: userId,
      type: 'comment',
      post: postId,
      comment: comment._id,
    });
  }

  await comment.populate('user', 'fullName profileImage');
  res.status(201).json({ success: true, data: comment });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new AppError('टिप्पणी नहीं मिली', 404);

  const post = await MediaPost.findById(comment.post);
  if (!post) throw new AppError('पोस्ट नहीं मिली', 404);

  const isAuthorized =
    req.user.id === comment.user.toString() ||
    req.user.id === post.author.toString() ||
    req.user.role === 'SUPER_ADMIN';
  if (!isAuthorized) throw new AppError('अनधिकृत', 403);

  await comment.deleteOne();
  post.commentsCount = Math.max(0, post.commentsCount - 1);
  await post.save();

  res.json({ success: true, message: 'टिप्पणी हटा दी गई' });
});

exports.getComments = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find({ post: id })
      .populate('user', 'fullName profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Comment.countDocuments({ post: id }),
  ]);

  res.json({
    success: true,
    data: comments,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
  });
});

// ---------- FOLLOW SYSTEM ----------
exports.followUser = catchAsync(async (req, res, next) => {
  const targetId = req.params.userId;
  const followerId = req.user.id;
  if (targetId === followerId) throw new AppError('स्वयं को फ़ॉलो नहीं कर सकते', 400);

  const target = await User.findById(targetId);
  if (!target) throw new AppError('यूज़र नहीं मिला', 404);

  const existing = await Follow.findOne({ follower: followerId, following: targetId });
  if (existing) throw new AppError('पहले से फ़ॉलो कर रहे हैं', 400);

  await Follow.create({ follower: followerId, following: targetId });
  await User.findByIdAndUpdate(followerId, { $inc: { 'mediaCreatorProfile.totalFollowing': 1 } });
  await User.findByIdAndUpdate(targetId, { $inc: { 'mediaCreatorProfile.totalFollowers': 1 } });

  await createNotification({ recipient: targetId, sender: followerId, type: 'follow' });

  res.json({ success: true, message: 'फ़ॉलो सफल' });
});

exports.unfollowUser = catchAsync(async (req, res, next) => {
  const targetId = req.params.userId;
  const followerId = req.user.id;

  const result = await Follow.deleteOne({ follower: followerId, following: targetId });
  if (result.deletedCount === 0) throw new AppError('फ़ॉलो नहीं कर रहे', 400);

  await User.findByIdAndUpdate(followerId, { $inc: { 'mediaCreatorProfile.totalFollowing': -1 } });
  await User.findByIdAndUpdate(targetId, { $inc: { 'mediaCreatorProfile.totalFollowers': -1 } });

  res.json({ success: true, message: 'अनफ़ॉलो सफल' });
});

exports.getFollowers = catchAsync(async (req, res, next) => {
  const userId = req.params.userId || req.user.id;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [follows, total] = await Promise.all([
    Follow.find({ following: userId })
      .populate('follower', 'fullName profileImage mediaCreatorProfile')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Follow.countDocuments({ following: userId }),
  ]);

  res.json({
    success: true,
    data: follows.map(f => f.follower),
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
  });
});

exports.getFollowing = catchAsync(async (req, res, next) => {
  const userId = req.params.userId || req.user.id;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [follows, total] = await Promise.all([
    Follow.find({ follower: userId })
      .populate('following', 'fullName profileImage mediaCreatorProfile')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Follow.countDocuments({ follower: userId }),
  ]);

  res.json({
    success: true,
    data: follows.map(f => f.following),
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
  });
});

exports.checkFollowStatus = catchAsync(async (req, res, next) => {
  const targetId = req.params.userId;
  const currentUserId = req.user.id;
  const follow = await Follow.findOne({ follower: currentUserId, following: targetId });
  res.json({ success: true, isFollowing: !!follow });
});

// ---------- SEARCH & CREATOR MANAGEMENT ----------
exports.searchCreators = catchAsync(async (req, res, next) => {
  const { q, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  let filter = { 'mediaCreatorProfile.isCreator': true };
  if (q && q.trim()) {
    filter.$or = [
      { fullName: { $regex: q.trim(), $options: 'i' } },
      { email: { $regex: q.trim(), $options: 'i' } },
    ];
  }

  const sort = q ? {} : { 'mediaCreatorProfile.totalFollowers': -1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('fullName profileImage mediaCreatorProfile')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: users,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
  });
});

exports.becomeCreator = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('यूज़र नहीं मिला', 404);
  if (user.mediaCreatorProfile?.isCreator) throw new AppError('पहले से ही क्रिएटर हैं', 400);

  user.mediaCreatorProfile = {
    ...user.mediaCreatorProfile,
    isCreator: true,
    creatorStatus: 'approved',
  };
  await user.save();

  res.json({ success: true, message: 'अब आप मीडिया क्रिएटर हैं!' });
});

// ---------- AD TRACKING ----------
exports.trackAdClick = catchAsync(async (req, res, next) => {
  const { campaignId } = req.body;
  const userId = req.user.id;

  const campaign = await AdCampaign.findById(campaignId);
  if (!campaign) throw new AppError('विज्ञापन नहीं मिला', 404);

  campaign.clicks += 1;
  campaign.spentBudget += campaign.bidAmount;
  await campaign.save();

  await AdEvent.create({
    campaignId,
    userId,
    eventType: 'click',
    metadata: {
      userLocation: { state: req.user.state, district: req.user.district },
      userRole: req.user.role,
    },
  });

  await User.findByIdAndUpdate(userId, {
    $push: { adsSeen: { campaignId, clicked: true, clickedAt: new Date() } },
  });

  res.json({ success: true, message: 'Click recorded', targetUrl: campaign.targetUrl });
});
// at the bottom of the controller
exports.getCreatorProfile = catchAsync(async (req, res, next) => {
  const userId = req.params.userId || req.user.id;

  const user = await User.findById(userId)
    .select('-password -otp -otpExpire')
    .lean();

  if (!user) throw new AppError('उपयोगकर्ता नहीं मिला', 404);

  res.json({ success: true, data: user });
});