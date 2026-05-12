const express = require('express');
const router = express.Router();
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

// Public verification (with protect, or can be public if needed)
router.get('/verify/:code', protect, memberCertificateController.verifyCertificate);

module.exports = router;