const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const licenseController = require('../controllers/license.controller');

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

router.get('/types', protect, licenseController.getLicenseTypes);
router.post('/purchase', protect, restrictTo(...ORGANIZATIONAL_ROLES), licenseController.purchaseLicense);
router.get('/my', protect, restrictTo(...ORGANIZATIONAL_ROLES), licenseController.getMyLicenses);

module.exports = router;