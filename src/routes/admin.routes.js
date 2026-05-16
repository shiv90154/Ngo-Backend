const express = require('express');
const router = express.Router();

const { protect, restrictTo } = require('../middleware');
const adminController = require('../controllers/admin.controller');

// Allowed admin roles
const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ADDITIONAL_DIRECTOR',
];


// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────
router.get(
  '/licenses/types',
  protect,
  adminController.getLicenseTypes
);

// ─────────────────────────────────────────────
// ADMIN MIDDLEWARE
// ─────────────────────────────────────────────
router.use(protect);
router.use(restrictTo(...ADMIN_ROLES));

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────
router.get('/stats', adminController.getStats);

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
router.post('/users', adminController.createUser);
router.get('/users', adminController.getUsers);
router.get('/users/export/csv', adminController.exportUsers);

// NEW: Get hierarchy for a specific user (subtree)
router.get('/users/:id/hierarchy', adminController.getUserHierarchy);

router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/toggle-active', adminController.toggleActive);
router.delete('/users/:id', adminController.deleteUser);

// ─────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// ─────────────────────────────────────────────
// LOGS
// ─────────────────────────────────────────────
router.get('/logs', adminController.getLogs);

// ─────────────────────────────────────────────
// MODULE DATA
// ─────────────────────────────────────────────
router.get('/module/:module', adminController.getModuleData);

// ─────────────────────────────────────────────
// HIERARCHY
// ─────────────────────────────────────────────
router.get('/hierarchy', adminController.getHierarchy);
router.get('/subordinates', adminController.getSubordinates);
router.get('/subordinates/:id', adminController.getSubordinates);

// ─────────────────────────────────────────────
// GLOBAL NOTIFICATIONS
// ─────────────────────────────────────────────
router.post(
  '/notifications/send',
  adminController.sendGlobalNotification
);

// ─────────────────────────────────────────────
// LICENSE TYPES
// ─────────────────────────────────────────────
router.post('/licenses/types', adminController.createLicenseType);
router.put('/licenses/types/:id', adminController.updateLicenseType);
router.delete('/licenses/types/:id', adminController.deleteLicenseType);

// ─────────────────────────────────────────────
// LICENSE PURCHASES
// ─────────────────────────────────────────────
router.get(
  '/licenses/purchases/all',
  adminController.getAllLicensePurchases
);

// ─────────────────────────────────────────────
// COMMISSION SPLITS
// ─────────────────────────────────────────────

// COMMENTED because controllers missing

// router.get(
//   '/commission-splits',
//   adminController.getCommissionSplits
// );

// router.put(
//   '/commission-splits/:id',
//   adminController.updateCommissionSplit
// );

// ─────────────────────────────────────────────
// EDUCATION PROGRAMS
// ─────────────────────────────────────────────
router.get(
  '/education-programs',
  adminController.getEducationPrograms
);

router.put(
  '/education-programs/:id',
  adminController.updateEducationProgram
);

// ─────────────────────────────────────────────
// MEETINGS
// ─────────────────────────────────────────────
router.get('/meetings/all', adminController.getAllMeetings);

router.patch(
  '/meetings/:id/status',
  adminController.updateMeetingStatus
);

// ─────────────────────────────────────────────
// PI SHARES
// ─────────────────────────────────────────────
router.get(
  '/pi-shares',
  restrictTo('SUPER_ADMIN'),
  adminController.getPIShares
);

router.post(
  '/pi-shares',
  restrictTo('SUPER_ADMIN'),
  adminController.createPIShare
);

router.put(
  '/pi-shares/:id',
  restrictTo('SUPER_ADMIN'),
  adminController.updatePIShare
);

router.delete(
  '/pi-shares/:id',
  restrictTo('SUPER_ADMIN'),
  adminController.deletePIShare
);

// ─────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────
router.get(
  '/payments',
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  adminController.getAllPayments
);

// ─────────────────────────────────────────────
// PI TRANSACTIONS
// ─────────────────────────────────────────────
router.get(
  '/pi-transactions',
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  adminController.getPITransactions
);

module.exports = router;