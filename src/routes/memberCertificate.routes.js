const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const memberCertificateController = require('../controllers/memberCertificate.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

router.post('/generate', protect, restrictTo(...ALLOWED), memberCertificateController.generateCertificate);
router.get('/all', protect, restrictTo(...ALLOWED), memberCertificateController.getAllCertificates);
router.get('/my', protect, memberCertificateController.getMyCertificates);
router.get('/verify/:code', protect, memberCertificateController.verifyCertificate);

module.exports = router;