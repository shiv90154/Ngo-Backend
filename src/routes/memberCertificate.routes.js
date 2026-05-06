const express = require('express');
const router = express.Router();
const certController = require('../controllers/memberCertificate.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// User
router.get('/my', protect, certController.getMyCertificates);

// Admin
router.post('/generate', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), certController.generateCertificate);
router.get('/all', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), certController.getAllCertificates);

// Public verification (no auth)
router.get('/verify/:verificationCode', certController.verifyCertificate);

module.exports = router;