// routes/serviceRequest.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, restrictTo } = require('../middleware');
const srController = require('../controllers/serviceRequest.controller');

// ---------- Multer config (unchanged) ----------
const uploadDir = path.join(__dirname, '../uploads/service-requests');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|doc|docx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only JPEG, PNG, PDF, DOC, DOCX files are allowed'));
  },
});

// ---------- Routes ----------
router.post('/', protect, upload.array('attachments', 5), srController.createRequest);
router.get('/my', protect, srController.getMyRequests);
router.get('/all', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), srController.getAllRequests);
router.get('/:id', protect, srController.getRequestById);

// User can update own request (title, description, etc.)
router.put('/:id', protect, srController.updateMyRequest);               // 🆕
// Admin can update status / notes
router.patch('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), srController.updateRequest);
// Delete
router.delete('/:id', protect, srController.deleteRequest);              // 🆕

module.exports = router;