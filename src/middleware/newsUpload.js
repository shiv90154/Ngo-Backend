// backend/src/middleware/newsUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');                        // 🆕 file system
const AppError = require('../utils/AppError');

// ---------- Ensure upload folder exists ----------
const uploadDir = path.join(__dirname, '../public/uploads/news');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ---------- Storage config ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);                         // use the pre‑created folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// ---------- File filter ----------
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('केवल इमेज फ़ाइलें अपलोड करें', 400), false);
  }
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });