const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const paymentController = require('../controllers/payment.controller');

router.post('/order', protect, paymentController.createOrder);
router.post('/verify', protect, paymentController.verifyPayment);

module.exports = router;