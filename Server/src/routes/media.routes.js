const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mediaController = require('../controllers/media.controller');
const { protect } = require('../middleware');

// Configure multer for media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/media');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  },
});

// Public feed
router.get('/feed', protect, mediaController.getFeed);

// Posts
router.post('/posts', protect, upload.array('media', 10), mediaController.createPost);
router.get('/posts/:id', protect, mediaController.getPost);
router.put('/posts/:id', protect, mediaController.updatePost);
router.delete('/posts/:id', protect, mediaController.deletePost);
router.get('/users/:userId/posts', protect, mediaController.getUserPosts);

// Likes
router.post('/posts/:id/like', protect, mediaController.likePost);
router.delete('/posts/:id/like', protect, mediaController.unlikePost);

// Comments
router.post('/posts/:id/comments', protect, mediaController.addComment);
router.delete('/comments/:commentId', protect, mediaController.deleteComment);
router.get('/posts/:id/comments', protect, mediaController.getComments);

// Follow
router.post('/follow/:userId', protect, mediaController.followUser);
router.delete('/follow/:userId', protect, mediaController.unfollowUser);

// 🆕 FIXED: Replace optional parameters with two separate routes
router.get('/followers', protect, mediaController.getFollowers);           // current user's followers
router.get('/followers/:userId', protect, mediaController.getFollowers);   // specific user's followers

router.get('/following', protect, mediaController.getFollowing);           // current user's following
router.get('/following/:userId', protect, mediaController.getFollowing);   // specific user's following

router.get('/follow-status/:userId', protect, mediaController.checkFollowStatus);

// Search
router.get('/search/creators', protect, mediaController.searchCreators);

// Become creator
router.post('/become-creator', protect, mediaController.becomeCreator);

module.exports = router;