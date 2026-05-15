const razorpayService = require('../services/razorpayService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// @desc   Create order for any payment type
// @route  POST /api/payment/order
exports.createOrder = catchAsync(async (req, res, next) => {
  const { amount, type, purpose } = req.body;
  if (!amount || amount < 1) {
    return next(new AppError('राशि आवश्यक है', 400));
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
exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('सभी पेमेंट फ़ील्ड आवश्यक हैं', 400));
  }

  const isValid = razorpayService.verifySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValid) {
    return next(new AppError('अमान्य भुगतान हस्ताक्षर', 400));
  }

  // यहाँ केवल सत्यापन होता है; वास्तविक व्यावसायिक लॉजिक (दान रिकॉर्ड, लाइसेंस एक्टिवेट, वॉलेट टॉप-अप)
  // संबंधित मॉड्यूल द्वारा बुलाया जाएगा।
  res.json({
    success: true,
    message: 'भुगतान सत्यापित',
    razorpay_payment_id,
    razorpay_order_id,
  });
});