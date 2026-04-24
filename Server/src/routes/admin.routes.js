// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

// All routes require admin roles
const adminRoles = [
  'SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_OFFICER',
  'DISTRICT_MANAGER', 'DISTRICT_PRESIDENT', 'FIELD_OFFICER',
  'BLOCK_OFFICER', 'VILLAGE_OFFICER'
];

router.use(protect);
router.use(restrictTo(...adminRoles));

// Dashboard
router.get('/stats', adminController.getStats);

// Users
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/toggle-active', adminController.toggleActive);
router.delete('/users/:id', adminController.deleteUser);

// Hierarchy
router.get('/hierarchy', adminController.getHierarchy);
// 🆕 Fixed: replaced optional param with two separate routes
router.get('/subordinates', adminController.getSubordinates);    // current admin's subordinates
router.get('/subordinates/:id', adminController.getSubordinates); // specific user's subordinates

module.exports = router;    