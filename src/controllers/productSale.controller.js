// backend/src/controllers/productSale.controller.js
const LicenseType = require('../models/LicenseType');
const EducationProgram = require('../models/EducationProgram');
const ProductSale = require('../models/ProductSale');
const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc   Get all sellable products (licenses + education programs)
// @route  GET /api/products/sellable
exports.getSellableProducts = catchAsync(async (req, res) => {
  const licenses = await LicenseType.find({ isActive: true });
  const eduPrograms = await EducationProgram.find({ isActive: true });

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

// @desc   Sell a license or education program (offline + online order creation)
// @route  POST /api/products/sell
exports.sellProduct = catchAsync(async (req, res, next) => {
  const { productType, productId, customerName, customerPhone, customerId, paymentMode } = req.body;

  if (!productType || !productId || !customerName) {
    return next(new AppError('All required fields must be provided', 400));
  }

  let amount;
  const saleData = {
    productType,
    customerName,
    customerPhone: customerPhone || '',
    soldBy: req.user._id,
    customer: customerId || null,
  };

  // Determine product details and amount
  if (productType === 'license') {
    const license = await LicenseType.findById(productId);
    if (!license) return next(new AppError('License not found', 404));
    amount = license.membershipFee;
    saleData.licenseType = license._id;
  } else if (productType === 'education') {
    const program = await EducationProgram.findById(productId);
    if (!program) return next(new AppError('Education program not found', 404));
    amount = program.fee;
    saleData.educationProgram = program._id;
  } else {
    return next(new AppError('Invalid product type', 400));
  }

  // Online payment – create Razorpay order, DO NOT save sale yet
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

  // Offline / cash sale – complete immediately
  saleData.amount = amount;
  saleData.transactionId = 'OFFLINE_' + Date.now();
  const sale = await ProductSale.create(saleData);

  // Update seller stats (license only)
  if (productType === 'license') {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        'licenseStats.totalLicensesSold': 1,
        'licenseStats.monthlyLicensesSold': 1,
      }
    });
  }

  // ❌ Old MLM commission distribution removed
  // const commissionType = productType === 'license' ? 'license_sale' : 'education_sale';
  // await calculateCommission(req.user._id, amount, commissionType, sale._id);

  sale.commissionDistributed = true; // just mark as completed, no actual distribution here
  await sale.save();

  res.status(201).json({ success: true, data: sale });
});

// @desc   Verify Razorpay payment & complete the sale (online flow)
// @route  POST /api/products/verify-sale
exports.verifySalePayment = catchAsync(async (req, res, next) => {
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
    return next(new AppError('Invalid payment signature', 400));
  }

  let amount;
  const saleData = {
    productType,
    customerName,
    customerPhone: customerPhone || '',
    soldBy: req.user._id,
    customer: customerId || null,
    transactionId: razorpay_payment_id,
  };

  if (productType === 'license') {
    const license = await LicenseType.findById(productId);
    if (!license) return next(new AppError('License not found', 404));
    amount = license.membershipFee;
    saleData.licenseType = license._id;
  } else if (productType === 'education') {
    const program = await EducationProgram.findById(productId);
    if (!program) return next(new AppError('Education program not found', 404));
    amount = program.fee;
    saleData.educationProgram = program._id;
  } else {
    return next(new AppError('Invalid product type', 400));
  }

  saleData.amount = amount;
  const sale = await ProductSale.create(saleData);

  if (productType === 'license') {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        'licenseStats.totalLicensesSold': 1,
        'licenseStats.monthlyLicensesSold': 1,
      }
    });
  }

  // ❌ Old MLM commission distribution removed
  // const commissionType = productType === 'license' ? 'license_sale' : 'education_sale';
  // await calculateCommission(req.user._id, amount, commissionType, sale._id);

  sale.commissionDistributed = true;
  await sale.save();

  res.status(201).json({ success: true, data: sale });
});

// @desc   Get own sales history (seller)
// @route  GET /api/products/my-sales
exports.getMySales = catchAsync(async (req, res) => {
  const sales = await ProductSale.find({ soldBy: req.user._id })
    .populate('licenseType', 'name')
    .populate('educationProgram', 'class fee')
    .sort({ purchaseDate: -1 });

  res.json({ success: true, data: sales });
});

// @desc   Get purchases of current logged-in user (as customer)
// @route  GET /api/products/my-purchases
exports.getMyPurchases = catchAsync(async (req, res) => {
  const purchases = await ProductSale.find({ customer: req.user._id })
    .populate('licenseType', 'name')
    .populate('educationProgram', 'class fee')
    .sort({ purchaseDate: -1 });

  res.json({ success: true, data: purchases });
});

// @desc   Admin – get all sales
// @route  GET /api/products/all-sales
exports.getAllSales = catchAsync(async (req, res) => {
  const sales = await ProductSale.find()
    .populate('licenseType', 'name')
    .populate('educationProgram', 'class fee')
    .populate('soldBy', 'fullName email role')
    .sort({ purchaseDate: -1 });

  res.json({ success: true, data: sales });
});