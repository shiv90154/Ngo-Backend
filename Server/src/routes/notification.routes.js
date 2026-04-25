// routes/notification.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const notificationController = require('../controllers/notification.controller');

// All routes require authentication
router.use(protect);

// ======================
// USER NOTIFICATION CRUD
// ======================
router.get('/', notificationController.getMyNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

// ======================
// ROLE-BASED PERSONAL MESSAGES
// ======================
router.post('/doctor/send', restrictTo('DOCTOR'), notificationController.sendDoctorNotification);
router.post('/teacher/send', restrictTo('TEACHER'), notificationController.sendTeacherNotification);
router.post('/agent/send', restrictTo('AGENT'), notificationController.sendAgentNotification);

// ======================
// ADMIN MASS NOTIFICATION (global)
// ======================
router.post(
  '/admin/send-global',
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  notificationController.sendGlobalNotification
);

module.exports = router;