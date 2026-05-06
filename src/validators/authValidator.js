const { body } = require('express-validator');

const VALID_ROLES = [
  'SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_OFFICER',
  'DISTRICT_MANAGER', 'DISTRICT_PRESIDENT', 'FIELD_OFFICER',
  'JILLA_BRANCH_MANAGER', 'JILLA_ADYAKSH', 'JILLA_FIELD_OFFICER',
  'BLOCK_OFFICER', 'VILLAGE_OFFICER', 'GRAM_BIKAS_ADHIKARI',
  'DOCTOR', 'TEACHER', 'AGENT', 'NGO', 'CLUB', 'USER',
];

exports.registerValidation = [
  body('fullName').notEmpty().withMessage('पूरा नाम आवश्यक है'),
  body('name').optional().notEmpty().withMessage('नाम आवश्यक है'),
  body('email').isEmail().withMessage('मान्य ईमेल दर्ज करें'),
  body('phone').optional().matches(/^\d{10}$/).withMessage('फ़ोन नंबर 10 अंकों का होना चाहिए'),
  body('mobile').optional().matches(/^\d{10}$/).withMessage('मोबाइल नंबर 10 अंकों का होना चाहिए'),
  body('password').isLength({ min: 6 }).withMessage('पासवर्ड कम से कम 6 अक्षरों का हो'),
  body('role').optional().isIn(VALID_ROLES).withMessage('अमान्य भूमिका'),
];

exports.loginValidation = [
  body('email').isEmail().withMessage('मान्य ईमेल दर्ज करें'),
  body('password').notEmpty().withMessage('पासवर्ड आवश्यक है'),
];

exports.otpValidation = [
  body('email').isEmail().withMessage('मान्य ईमेल दर्ज करें'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP 6 अंकों का होना चाहिए'),
];

exports.resetPasswordValidation = [
  body('email').isEmail().withMessage('मान्य ईमेल दर्ज करें'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP 6 अंकों का होना चाहिए'),
  body('newPassword').isLength({ min: 6 }).withMessage('नया पासवर्ड कम से कम 6 अक्षरों का हो'),
];