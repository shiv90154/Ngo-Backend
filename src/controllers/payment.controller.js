// backend/src/controllers/payment.controller.js
const razorpayService = require('../services/razorpayService');
const asyncHandler = require('express-async-handler');

// @desc   Create order for any payment type
// @route  POST /api/payment/order
exports.createOrder = asyncHandler(async (req, res) => {
  const { amount, type, purpose } = req.body;
  if (!amount || amount < 1) {
    return res.status(400).json({ success: false, message: 'राशि आवश्यक है' });
  }
  const notes = {
    userId: req.user.id,
    type: type || 'generic',
    purpose: purpose || '',
  };
  const order = await razorpayService.createOrder(amount, notes);
  res.json({ success: true, ...order });
});

// @desc   Verify payment (common)
// @route  POST /api/payment/verify
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'All payment fields required' });
  }

  const isValid = razorpayService.verifySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Invalid payment signature' });
  }

  // Here we just verify; the actual business logic (record donation, activate license, top-up wallet)
  // will be called by the specific module after verification.
  res.json({
    success: true,
    message: 'Payment verified',
    razorpay_payment_id,
    razorpay_order_id,
  });
});