const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { protect, restrictTo } = require('../middleware');
const memberCertificateController = require('../controllers/memberCertificate.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

// Generate certificate (NGO/Admin only)
router.post('/generate', protect, restrictTo(...ALLOWED), memberCertificateController.generateCertificate);

// View all certificates (Admin/NGO)
router.get('/all', protect, restrictTo(...ALLOWED), memberCertificateController.getAllCertificates);

// My issued certificates
router.get('/my', protect, memberCertificateController.getMyCertificates);

// Public verification
router.get('/verify/:code', memberCertificateController.verifyCertificate);

// 🆕 Download Certificate by ID
router.get('/:id/download', protect, async (req, res) => {
  const cert = await require('../models/MemberCertificate').findById(req.params.id);
  if (!cert || !cert.certificateUrl) {
    return res.status(404).json({ success: false, message: 'Certificate not found' });
  }

  const filePath = path.join(__dirname, '../', cert.certificateUrl);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  const friendlyName = `certificate_${cert.verificationCode}.pdf`;
  res.download(filePath, friendlyName);
});

module.exports = router;