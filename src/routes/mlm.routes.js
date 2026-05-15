// backend/src/routes/mlm.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const mlmController = require('../controllers/mlm.controller');

// User routes (any logged in user with NGO roles)
router.get('/earnings', protect, mlmController.getMyEarnings);
router.get('/downline', protect, mlmController.getDownline);
router.get('/network', protect, mlmController.getNetwork);

// Admin routes (only Super Admin & Additional Director)
router.get('/commissions', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), mlmController.getCommissions);
router.post('/payout/:userId', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), mlmController.payoutUser);
router.post('/payout/batch', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), mlmController.batchPayout);

module.exports = router;