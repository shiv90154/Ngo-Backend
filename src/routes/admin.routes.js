const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const adminController = require('../controllers/admin.controller');

// Allowed admin roles (as per your User model)
const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ADDITIONAL_DIRECTOR',
  
];

// ─── Public‑read (any authenticated user) ───
router.get('/licenses/types', protect, adminController.getLicenseTypes);

// ─── Admin‑only routes ───
router.use(protect);
router.use(restrictTo(...ADMIN_ROLES));

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

// ---------- LICENSE TYPES ----------
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
router.post('/commission-splits', adminController.createCommissionSplit);
router.delete('/commission-splits/:id', adminController.deleteCommissionSplit);

router.get('/payments', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), adminController.getAllPayments);
module.exports = router;