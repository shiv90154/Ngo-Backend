const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const subCtrl = require('../controllers/subscription.controller');

// Public (for authenticated users)
router.get('/plans', protect, subCtrl.getPlans);
router.post('/purchase', protect, subCtrl.purchaseSubscription);
router.post('/verify', protect, subCtrl.verifyPayment);
router.get('/my', protect, subCtrl.mySubscription);
router.post('/cancel', protect, subCtrl.cancelSubscription);

// Admin
router.post('/plans', protect, restrictTo('SUPER_ADMIN','ADDITIONAL_DIRECTOR'), subCtrl.createPlan);
router.put('/plans/:id', protect, restrictTo('SUPER_ADMIN','ADDITIONAL_DIRECTOR'), subCtrl.updatePlan);
router.delete('/plans/:id', protect, restrictTo('SUPER_ADMIN','ADDITIONAL_DIRECTOR'), subCtrl.deletePlan);
router.get('/payments', protect, restrictTo('SUPER_ADMIN','ADDITIONAL_DIRECTOR'), subCtrl.getPayments);

module.exports = router;