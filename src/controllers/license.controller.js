const LicenseType = require('../models/LicenseType');
const LicensePurchase = require('../models/LicensePurchase');
const User = require('../models/user.model');
const { calculateCommission } = require('../services/mlmEngine');
const asyncHandler = require('express-async-handler');

// @desc   Purchase a license – sold by organizational user to a customer
// @route  POST /api/licenses/purchase
// @access Private (Organizational roles)
exports.purchaseLicense = asyncHandler(async (req, res) => {
  const { licenseTypeId, customerName, customerPhone } = req.body;

  if (!licenseTypeId || !customerName) {
    return res.status(400).json({ success: false, message: 'लाइसेंस प्रकार और ग्राहक का नाम आवश्यक है' });
  }

  const licenseType = await LicenseType.findById(licenseTypeId);
  if (!licenseType) {
    return res.status(404).json({ success: false, message: 'लाइसेंस प्रकार नहीं मिला' });
  }

  // Create purchase record
  const purchase = await LicensePurchase.create({
    licenseType: licenseType._id,
    customerName,
    customer: null, // link later if customer registers
    amount: licenseType.membershipFee,
    soldBy: req.user._id,      // विक्रेता (ऑर्गनाइज़ेशनल रोल)
  });

  // विक्रेता के लाइसेंस आँकड़े अपडेट करो
  const seller = await User.findById(req.user._id);
  if (seller) {
    seller.licenseStats.totalLicensesSold = (seller.licenseStats.totalLicensesSold || 0) + 1;
    seller.licenseStats.monthlyLicensesSold = (seller.licenseStats.monthlyLicensesSold || 0) + 1;
    // सैलरी एलिजिबिलिटी आदि बाद में जोड़ सकते हो
    await seller.save();
  }

  // 🔥 विक्रेता की स्पॉन्सर चेन पर कमीशन बाँटो (5 लेवल)
  await calculateCommission(req.user._id, licenseType.membershipFee, 'license_purchase', purchase._id);

  res.status(201).json({ success: true, data: purchase });
});