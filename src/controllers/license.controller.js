// backend/src/controllers/license.controller.js
const LicenseType = require('../models/LicenseType');
const LicensePurchase = require('../models/LicensePurchase');
const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// @desc   सभी एक्टिव लाइसेंस टाइप दिखाओ
// @route  GET /api/licenses/types
// @access Private (कोई भी लॉगिन यूज़र)
exports.getLicenseTypes = catchAsync(async (req, res, next) => {
  const licenses = await LicenseType.find({ isActive: true });
  res.json({ success: true, data: licenses });
});

// @desc   मेरे द्वारा बेचे गए लाइसेंस
// @route  GET /api/licenses/my
// @access Private (Organizational roles)
exports.getMyLicenses = catchAsync(async (req, res, next) => {
  const purchases = await LicensePurchase.find({ soldBy: req.user._id })
    .populate('licenseType', 'name membershipFee')
    .sort('-createdAt');
  res.json({ success: true, data: purchases });
});

// @desc   लाइसेंस बेचो (ग्राहक को)
// @route  POST /api/licenses/purchase
// @access Private (Organizational roles)
exports.purchaseLicense = catchAsync(async (req, res, next) => {
  const { licenseTypeId, customerName, customerPhone } = req.body;

  if (!licenseTypeId || !customerName) {
    return next(new AppError('लाइसेंस प्रकार और ग्राहक का नाम आवश्यक है', 400));
  }

  const licenseType = await LicenseType.findById(licenseTypeId);
  if (!licenseType) {
    return next(new AppError('लाइसेंस प्रकार नहीं मिला', 404));
  }

  // 1. खरीदारी रिकॉर्ड बनाओ
  const purchase = await LicensePurchase.create({
    licenseType: licenseType._id,
    customerName,
    customerPhone,
    customer: null,
    amount: licenseType.membershipFee,
    soldBy: req.user._id,
  });

  // 2. विक्रेता के लाइसेंस आँकड़े अपडेट
  await User.findByIdAndUpdate(req.user._id, {
    $inc: {
      'licenseStats.totalLicensesSold': 1,
      'licenseStats.monthlyLicensesSold': 1
    }
  });

  // ❌ पुराना MLM कमीशन हटाया गया
  // await calculateCommission(req.user._id, licenseType.membershipFee, 'license_sale', purchase._id);

  // 3. बिक्री पूर्ण
  purchase.commissionDistributed = true;
  await purchase.save();

  res.status(201).json({ success: true, data: purchase });
});