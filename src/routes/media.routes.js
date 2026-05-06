const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mediaController = require('../controllers/media.controller');
const { protect } = require('../middleware');
const validate = require('../middleware/validate');
const mediaValidator = require('../validators/mediaValidator');

// Multer config
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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('केवल इमेज और वीडियो अपलोड करें'), false);
    }
  },
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `अपलोड विफल: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// Public Feed
router.get('/feed', protect, mediaController.getFeed);

// Posts
router.post(
  '/posts',
  protect,
  upload.array('media', 10),
  handleMulterError,
  validate(mediaValidator.createPost),
  mediaController.createPost
);
router.get('/posts/:id', protect, mediaController.getPost);
router.put('/posts/:id', protect, validate(mediaValidator.updatePost), mediaController.updatePost);
router.delete('/posts/:id', protect, mediaController.deletePost);
router.get('/users/:userId/posts', protect, mediaController.getUserPosts);

router.get('/users/:userId/profile', protect, mediaController.getCreatorProfile)
// Likes & Comments
router.post('/posts/:id/like', protect, mediaController.likePost);
router.delete('/posts/:id/like', protect, mediaController.unlikePost);
router.post('/posts/:id/comments', protect, validate(mediaValidator.addComment), mediaController.addComment);
router.delete('/comments/:commentId', protect, validate(mediaValidator.deleteComment), mediaController.deleteComment);
router.get('/posts/:id/comments', protect, mediaController.getComments);

// Follow
router.post('/follow/:userId', protect, validate(mediaValidator.followUser), mediaController.followUser);
router.delete('/follow/:userId', protect, mediaController.unfollowUser);
router.get('/followers', protect, mediaController.getFollowers);
router.get('/followers/:userId', protect, mediaController.getFollowers);
router.get('/following', protect, mediaController.getFollowing);
router.get('/following/:userId', protect, mediaController.getFollowing);
router.get('/follow-status/:userId', protect, mediaController.checkFollowStatus);

// Search & Creator
router.get('/search/creators', protect, mediaController.searchCreators);
router.post('/become-creator', protect, mediaController.becomeCreator);

// Ads
router.post('/ads/track-click', protect, mediaController.trackAdClick);

module.exports = router;