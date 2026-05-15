// backend/src/routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const fieldDashboardController = require('../controllers/fieldDashboard.controller');
const scopeFilter = require('../middleware/scopeFilter'); // नया

// NGO Organizational Roles
const ORG_ROLES = [
  'SUPER_ADMIN',
  'ADDITIONAL_DIRECTOR',
  'STATE_DEVELOPMENT_COORDINATOR',
  'DISTRICT_BRANCH_MANAGER',
  'DISTRICT_PRESIDENT',
  'DISTRICT_FIELD_COORDINATOR',
  'BAMS_DOCTOR',
  'BLOCK_DEVELOPMENT_COORDINATOR',
  'GRAM_DEVELOPMENT_COORDINATOR',
];

// सभी रूट पर पहले protect और फिर scopeFilter (रोल के हिसाब से फ़िल्टर सेट करने वाला)
router.use(protect);
router.use(scopeFilter);

// ---------- organizational dashboard ----------
router.get(
  '/organizational/stats',
  restrictTo(...ORG_ROLES),
  fieldDashboardController.getDashboardStats
);

// ---------- अन्य organizational routes ----------
router.get('/organizational/team', restrictTo(...ORG_ROLES), fieldDashboardController.getTeam);
router.get('/organizational/licenses', restrictTo(...ORG_ROLES), fieldDashboardController.getLicenses);
router.get('/organizational/commissions', restrictTo(...ORG_ROLES), fieldDashboardController.getCommissions);
router.get('/organizational/contributions', restrictTo(...ORG_ROLES), fieldDashboardController.getContributions);
router.get('/organizational/meetings', restrictTo(...ORG_ROLES), fieldDashboardController.getMeetings);

// (optional) general fallback, same logic
router.get('/stats', restrictTo(...ORG_ROLES), fieldDashboardController.getDashboardStats);

module.exports = router;