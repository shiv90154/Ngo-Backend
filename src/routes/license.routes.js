// backend/src/routes/license.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const licenseController = require('../controllers/license.controller');

// Allowed roles – जो लाइसेंस बेच सकते हैं (Organizational)
const ORGANIZATIONAL_ROLES = [
  'SUPER_ADMIN',
  'ADDITIONAL_DIRECTOR',
  'STATE_DEVELOPMENT_COORDINATOR',
  'DISTRICT_BRANCH_MANAGER',
  'DISTRICT_PRESIDENT',
  'DISTRICT_FIELD_COORDINATOR',
  'BLOCK_DEVELOPMENT_COORDINATOR',
  'GRAM_DEVELOPMENT_COORDINATOR',
];

// 1. लाइसेंस प्रकारों की सूची (कोई भी लॉगिन यूज़र देख सकता है)
router.get('/types', protect, licenseController.getLicenseTypes);

// 2. लाइसेंस खरीदें / बेचें (केवल Organizational रोल)
router.post(
  '/purchase',
  protect,
  restrictTo(...ORGANIZATIONAL_ROLES),
  licenseController.purchaseLicense
);

// 3. मेरे द्वारा बेचे गए लाइसेंस (विक्रेता के लिए)
router.get(
  '/my',
  protect,
  restrictTo(...ORGANIZATIONAL_ROLES),
  licenseController.getMyLicenses
);

module.exports = router;