// backend/src/routes/news.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');     // तेरे middleware index से
const newsUpload = require('../middleware/newsUpload');      // ऊपर वाला
const {
  createNews,
  getNews,
  getNewsById,
  updateNews,
  deleteNews,
} = require('../controllers/newsController');

// पब्लिक रूट
router.get('/', getNews);
router.get('/:id', getNewsById);

// एडिटर और एडमिन रूट
router.post(
  '/',
  protect,
  restrictTo('NEWS_EDITOR', 'SUPER_ADMIN'),
  newsUpload.single('image'),
  createNews
);

router.put(
  '/:id',
  protect,
  restrictTo('NEWS_EDITOR', 'SUPER_ADMIN'),
  newsUpload.single('image'),
  updateNews
);

router.delete(
  '/:id',
  protect,
  restrictTo('NEWS_EDITOR', 'SUPER_ADMIN'),
  deleteNews
);

module.exports = router;