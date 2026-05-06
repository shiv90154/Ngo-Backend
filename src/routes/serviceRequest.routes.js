const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, restrictTo } = require('../middleware');
const srController = require('../controllers/serviceRequest.controller');

// ---------- Multer configuration for service request attachments ----------
const uploadDir = path.join(__dirname, '../uploads/service-requests');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
  limits: { fileSize: 10 * 1024 * 1024 },          // 10 MB max file size
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|doc|docx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, PDF, DOC, DOCX files are allowed'));
    }
  },
});

// ---------- Routes ----------

// User creates a service request (supports up to 5 attachments)
router.post('/', protect, upload.array('attachments', 5), srController.createRequest);

// User views own requests
router.get('/my', protect, srController.getMyRequests);

// Admin: get all requests
router.get('/all', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), srController.getAllRequests);

// Get a single request (owner or admin)
router.get('/:id', protect, srController.getRequestById);

// Admin: update request status / add notes
router.patch('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), srController.updateRequest);

module.exports = router;