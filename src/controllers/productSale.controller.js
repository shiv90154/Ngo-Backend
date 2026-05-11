// backend/src/controllers/productSale.controller.js
const LicenseType = require('../models/LicenseType');
const EducationProgram = require('../models/EducationProgram');
const ProductSale = require('../models/ProductSale');
const User = require('../models/user.model');
const { calculateCommission } = require('../services/mlmEngine');
const asyncHandler = require('express-async-handler');

exports.getSellableProducts = asyncHandler(async (req, res) => {
  const licenses = await LicenseType.find({ isActive: true });
  const eduPrograms = await EducationProgram.find();

  res.json({
    success: true,
    data: {
      licenses,
      educationPrograms: eduPrograms.map(ep => ({
        _id: ep._id,
        title: `Class ${ep.class} Education Program`,
        fee: ep.fee,
        incentive: ep.incentive,
        type: 'education',
      })),
    }
  });
});

exports.sellProduct = asyncHandler(async (req, res) => {
  const { productType, productId, customerName, customerPhone } = req.body;
  if (!productType || !productId || !customerName) {
    return res.status(400).json({ success: false, message: 'सभी फ़ील्ड भरें' });
  }

  let amount, saleData = {
    productType,
    customerName,
    customerPhone: customerPhone || '',
    soldBy: req.user._id,
  };

  if (productType === 'license') {
    const license = await LicenseType.findById(productId);
    if (!license) return res.status(404).json({ success: false, message: 'लाइसेंस नहीं मिला' });
    amount = license.membershipFee;
    saleData.licenseType = license._id;
  } else if (productType === 'education') {
    const program = await EducationProgram.findById(productId);
    if (!program) return res.status(404).json({ success: false, message: 'एजुकेशन प्रोग्राम नहीं मिला' });
    amount = program.fee;
    saleData.educationProgram = program._id;
  } else {
    return res.status(400).json({ success: false, message: 'अमान्य प्रोडक्ट टाइप' });
  }

  saleData.amount = amount;
  const sale = await ProductSale.create(saleData);

  await User.findByIdAndUpdate(req.user._id, {
    $inc: {
      'licenseStats.totalLicensesSold': 1,
      'licenseStats.monthlyLicensesSold': 1,
    }
  });

  await calculateCommission(req.user._id, amount, productType === 'license' ? 'license_sale' : 'education_sale', sale._id);

  res.status(201).json({ success: true, data: sale });
});

// 🆕 Own sales history
exports.getMySales = asyncHandler(async (req, res) => {
  const sales = await ProductSale.find({ soldBy: req.user._id })
    .populate('licenseType', 'name')
    .populate('educationProgram', 'title')
    .sort({ purchaseDate: -1 });

  res.json({ success: true, data: sales });
});