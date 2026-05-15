const rateLimit = require('express-rate-limit');

exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'बहुत अधिक लॉगिन प्रयास। कृपया 15 मिनट बाद पुनः प्रयास करें।' },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'बहुत अधिक OTP अनुरोध। कृपया 5 मिनट बाद पुनः प्रयास करें।' },
});