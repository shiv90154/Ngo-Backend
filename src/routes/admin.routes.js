const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const adminController = require('../controllers/admin.controller');

const adminRoles = [
  'SUPER_ADMIN','ADDITIONAL_DIRECTOR','STATE_OFFICER',
  'DISTRICT_MANAGER','DISTRICT_PRESIDENT','FIELD_OFFICER',
  'BLOCK_OFFICER','VILLAGE_OFFICER'
];

// ──────────────────────────────────────────────
// 1️⃣ Public‑read routes (any authenticated user)
//    Must be placed BEFORE the global restrictTo
// ──────────────────────────────────────────────
router.get('/licenses/types', protect, adminController.getLicenseTypes);

// ──────────────────────────────────────────────
// 2️⃣ Global admin middleware – everything below
//    is restricted to adminRoles
// ──────────────────────────────────────────────
router.use(protect);
router.use(restrictTo(...adminRoles));

// ---------- STATS ----------
router.get('/stats', adminController.getStats);

// ---------- USERS ----------
router.post('/users', adminController.createUser);
router.get('/users', adminController.getUsers);
router.get('/users/export/csv', adminController.exportUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/toggle-active', adminController.toggleActive);
router.delete('/users/:id', adminController.deleteUser);

// ---------- SETTINGS ----------
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// ---------- LOGS ----------
router.get('/logs', adminController.getLogs);

// ---------- MODULE DATA ----------
router.get('/module/:module', adminController.getModuleData);

// ---------- HIERARCHY ----------
router.get('/hierarchy', adminController.getHierarchy);
router.get('/subordinates', adminController.getSubordinates);
router.get('/subordinates/:id', adminController.getSubordinates);

// ---------- GLOBAL NOTIFICATIONS ----------
router.post('/notifications/send', adminController.sendGlobalNotification);

// ======================
// 🆕 Admin‑only mutations (still behind the global restrictTo)
// ======================

// ---------- LICENSE TYPES (CUD) ----------
router.post('/licenses/types', adminController.createLicenseType);
router.put('/licenses/types/:id', adminController.updateLicenseType);
router.delete('/licenses/types/:id', adminController.deleteLicenseType);

// ---------- LICENSE PURCHASES ----------
router.get('/licenses/purchases/all', adminController.getAllLicensePurchases);

// ---------- COMMISSION SPLITS ----------
router.get('/commission-splits', adminController.getCommissionSplits);
router.put('/commission-splits/:id', adminController.updateCommissionSplit);

// ---------- EDUCATION PROGRAMS ----------
router.get('/education-programs', adminController.getEducationPrograms);
router.put('/education-programs/:id', adminController.updateEducationProgram);

// ---------- MEETINGS ----------
router.get('/meetings/all', adminController.getAllMeetings);
router.patch('/meetings/:id/status', adminController.updateMeetingStatus);

// ---------- WEEKLY CONTRIBUTIONS ----------
router.get('/contributions/all', adminController.getAllContributions);

module.exports = router;