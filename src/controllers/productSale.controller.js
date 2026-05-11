// backend/src/controllers/productSale.controller.js
const LicenseType = require('../models/LicenseType');
const EducationProgram = require('../models/EducationProgram');
const ProductSale = require('../models/ProductSale');
const User = require('../models/user.model');
const { calculateCommission } = require('../services/mlmEngine');
const asyncHandler = require('express-async-handler');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc   Get all sellable products (licenses + education programs)
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

// @desc   Sell a license or education program (supports online & offline)
exports.sellProduct = asyncHandler(async (req, res) => {
  const { productType, productId, customerName, customerPhone, customerId, paymentMode } = req.body;

  if (!productType || !productId || !customerName) {
    return res.status(400).json({ success: false, message: 'सभी फ़ील्ड भरें' });
  }

  let amount;
  const saleData = {
    productType,
    customerName,
    customerPhone: customerPhone || '',
    soldBy: req.user._id,
    customer: customerId || null,
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

  // 🆕 Online payment – create Razorpay order, DO NOT save sale yet
  if (paymentMode === 'online') {
    const options = {
      amount: amount * 100,
      currency: 'INR',
      receipt: `sale_${Date.now()}`,
      notes: {
        productType,
        productId,
        customerName,
        customerPhone: customerPhone || '',
        customerId: customerId || '',
        sellerId: req.user._id.toString(),
      },
    };
    const order = await razorpay.orders.create(options);
    return res.json({
      success: true,
      orderRequired: true,
      order_id: order.id,
      amount: order.amount,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  }

  // Offline / cash sale – original flow
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

// @desc   Verify Razorpay payment & complete the sale (online flow)
exports.verifySalePayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    productType,
    productId,
    customerName,
    customerPhone,
    customerId,
  } = req.body;

  // Verify signature
  const generated = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generated !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Invalid payment signature' });
  }

  let amount;
  const saleData = {
    productType,
    customerName,
    customerPhone: customerPhone || '',
    soldBy: req.user._id,
    customer: customerId || null,
    transactionId: razorpay_payment_id,   // Optional: add this field to ProductSale model
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

// @desc   Get own sales history (seller)
exports.getMySales = asyncHandler(async (req, res) => {
  const sales = await ProductSale.find({ soldBy: req.user._id })
    .populate('licenseType', 'name')
    .populate('educationProgram', 'title')
    .sort({ purchaseDate: -1 });

  res.json({ success: true, data: sales });
});

// @desc   Get purchases of current logged-in user (as customer)
exports.getMyPurchases = asyncHandler(async (req, res) => {
  const purchases = await ProductSale.find({ customer: req.user._id })
    .populate('licenseType', 'name')
    .populate('educationProgram', 'title fee')
    .sort({ purchaseDate: -1 });

  res.json({ success: true, data: purchases });
});

// @desc   Admin – get all sales
exports.getAllSales = asyncHandler(async (req, res) => {
  const sales = await ProductSale.find()
    .populate('licenseType', 'name')
    .populate('educationProgram', 'title')
    .populate('soldBy', 'fullName email role')
    .sort({ purchaseDate: -1 });

  res.json({ success: true, data: sales });
});