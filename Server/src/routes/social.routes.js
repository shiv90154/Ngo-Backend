const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  createPost,
  getFeed,
  getUserPosts,
  likePost,
  unlikePost,
  addComment,
  deleteComment,
  sharePost,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getSuggestions,
  getNotifications,
  markNotificationRead,
  getTrendingPosts,
  uploadMedia,
  deletePost,
} = require('../controllers/social.controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/social');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Post routes
router.post('/posts', protect, upload.array('media', 5), createPost);
router.get('/feed', protect, getFeed);
router.get('/posts/user/:userId', protect, getUserPosts);
router.delete('/posts/:postId', protect, deletePost);

// Interaction
router.post('/posts/:postId/like', protect, likePost);
router.delete('/posts/:postId/like', protect, unlikePost);
router.post('/posts/:postId/comment', protect, addComment);
router.delete('/posts/:postId/comment/:commentId', protect, deleteComment);
router.post('/posts/:postId/share', protect, sharePost);

// Follow
router.post('/follow/:userId', protect, followUser);
router.delete('/follow/:userId', protect, unfollowUser);
router.get('/followers/:userId', protect, getFollowers);
router.get('/following/:userId', protect, getFollowing);
router.get('/suggestions', protect, getSuggestions);

// Notifications
router.get('/notifications', protect, getNotifications);
router.put('/notifications/:notificationId/read', protect, markNotificationRead);

// Trending
router.get('/trending', getTrendingPosts);

// Media upload
router.post('/upload', protect, upload.single('media'), uploadMedia);

module.exports = router;