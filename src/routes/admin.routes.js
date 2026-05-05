const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

const adminRoles = [
  'SUPER_ADMIN','ADDITIONAL_DIRECTOR','STATE_OFFICER',
  'DISTRICT_MANAGER','DISTRICT_PRESIDENT','FIELD_OFFICER',
  'BLOCK_OFFICER','VILLAGE_OFFICER'
];

// Global middleware – protect + allow all adminRoles for the existing routes
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
// 🆕 SUPER ADMIN ONLY ROUTES
// ======================

// ---------- LICENSE TYPES ----------
router.get('/licenses/types', restrictTo('SUPER_ADMIN'), adminController.getLicenseTypes);
router.post('/licenses/types', restrictTo('SUPER_ADMIN'), adminController.createLicenseType);
router.put('/licenses/types/:id', restrictTo('SUPER_ADMIN'), adminController.updateLicenseType);
router.delete('/licenses/types/:id', restrictTo('SUPER_ADMIN'), adminController.deleteLicenseType);

// ---------- LICENSE PURCHASES ----------
router.get('/licenses/purchases/all', restrictTo('SUPER_ADMIN'), adminController.getAllLicensePurchases);

// ---------- COMMISSION SPLITS ----------
router.get('/commission-splits', restrictTo('SUPER_ADMIN'), adminController.getCommissionSplits);
router.put('/commission-splits/:id', restrictTo('SUPER_ADMIN'), adminController.updateCommissionSplit);

// ---------- EDUCATION PROGRAMS ----------
router.get('/education-programs', restrictTo('SUPER_ADMIN'), adminController.getEducationPrograms);
router.put('/education-programs/:id', restrictTo('SUPER_ADMIN'), adminController.updateEducationProgram);

// ---------- MEETINGS ----------
router.get('/meetings/all', restrictTo('SUPER_ADMIN'), adminController.getAllMeetings);
router.patch('/meetings/:id/status', restrictTo('SUPER_ADMIN'), adminController.updateMeetingStatus);

// ---------- WEEKLY CONTRIBUTIONS ----------
router.get('/contributions/all', restrictTo('SUPER_ADMIN'), adminController.getAllContributions);

module.exports = router;