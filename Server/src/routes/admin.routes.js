const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

const adminRoles = [
  'SUPER_ADMIN','ADDITIONAL_DIRECTOR','STATE_OFFICER',
  'DISTRICT_MANAGER','DISTRICT_PRESIDENT','FIELD_OFFICER',
  'BLOCK_OFFICER','VILLAGE_OFFICER'
];

router.use(protect);
router.use(restrictTo(...adminRoles));

// Stats
router.get('/stats', adminController.getStats);

// Users
router.get('/users', adminController.getUsers);
router.get('/users/export/csv', adminController.exportUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/toggle-active', adminController.toggleActive);
router.delete('/users/:id', adminController.deleteUser);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Logs
router.get('/logs', adminController.getLogs);

// Module data
router.get('/module/:module', adminController.getModuleData);

// Hierarchy
router.get('/hierarchy', adminController.getHierarchy);
router.get('/subordinates', adminController.getSubordinates);
router.get('/subordinates/:id', adminController.getSubordinates);

// Global notifications
router.post('/notifications/send', adminController.sendGlobalNotification);

module.exports = router;