const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const mlmController = require('../controllers/mlm.controller');

// User routes
router.get('/earnings', protect, mlmController.getMyEarnings);
router.get('/downline', protect, mlmController.getDownline);
router.get('/downline/:userId', protect, mlmController.getDownline);

// Admin routes
router.get('/commissions', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), mlmController.getCommissions);
router.post('/payout/:userId', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), mlmController.payoutUser);
router.post('/payout/batch', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), mlmController.batchPayout);

module.exports = router;