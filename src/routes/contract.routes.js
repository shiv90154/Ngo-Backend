const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, restrictTo } = require('../middleware');
const contractController = require('../controllers/contract.controller');

// Multer for signature upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/signatures')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Admin routes
router.post('/', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), contractController.createOrUpdateContract);
router.get('/all', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), contractController.getAllContracts);
router.patch('/:userId/review', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), contractController.reviewContract);

// User routes
router.get('/my', protect, contractController.getMyContract);
router.put('/my', protect, upload.single('signature'), contractController.updateMyContract);

module.exports = router;