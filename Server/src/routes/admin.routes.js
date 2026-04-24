// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

// All routes require SUPER_ADMIN or ADDITIONAL_DIRECTOR
router.use(protect);
router.use(restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'));

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/toggle-active', adminController.toggleActive);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;