// backend/src/controllers/donation.controller.js
const Donation = require('../models/Donation');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { generateDonationReceipt } = require('../services/receiptGenerator');
const sendEmail = require('../utils/sendEmail');
const path = require('path');
const fs = require('fs');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Helper to generate receipt and optionally email it ──
const attachReceipt = async (donation) => {
  try {
    const receiptNumber = `RCPT-${Date.now().toString(36).toUpperCase()}-${donation._id.toString().slice(-6)}`;
    const receiptUrl = await generateDonationReceipt({
      donorName: donation.donorName,
      email: donation.email,
      amount: donation.amount,
      purpose: donation.purpose,
      date: donation.date,
      receiptNumber,
    });
    donation.receiptUrl = receiptUrl;
    await donation.save();

    // Email the receipt if donor has email
    if (donation.email) {
      try {
        await sendEmail.sendDonationReceipt(donation.email, donation.donorName, receiptUrl);
        console.log(`Receipt emailed to ${donation.email}`);
      } catch (emailErr) {
        console.error('Failed to email receipt:', emailErr.message);
      }
    }
  } catch (err) {
    console.error('Failed to generate receipt:', err.message);
  }
};

// ── 1️⃣ Create Razorpay order for online donation ──
exports.createDonationOrder = catchAsync(async (req, res, next) => {
  const { amount } = req.body;
  if (!amount || amount < 1) {
    return next(new AppError('Donation amount is required', 400));
  }

  const shortId = req.user.id.toString().slice(-6);
  const timestamp = Date.now().toString(36);
  const receipt = `don_${shortId}_${timestamp}`.slice(0, 40);

  const options = {
    amount: amount * 100,
    currency: 'INR',
    receipt,
    notes: {
      userId: req.user.id,
      purpose: req.body.purpose || 'Donation',
    },
  };

  const order = await razorpay.orders.create(options);
  res.json({
    success: true,
    order_id: order.id,
    amount: order.amount,
    key_id: process.env.RAZORPAY_KEY_ID,
  });
});

// ── 2️⃣ Verify payment & record online donation ──
exports.verifyDonationPayment = catchAsync(async (req, res, next) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    donorName,
    purpose,
    amount,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
    return next(new AppError('All payment details are required', 400));
  }

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return next(new AppError('Invalid payment signature', 400));
  }

  const donation = await Donation.create({
    donorName: donorName || req.user.fullName,
    email: req.user.email,
    amount,
    purpose: purpose || 'Online Donation',
    user: req.user.id,
    type: 'online',
    transactionId: razorpay_payment_id,
    state: req.user.state,
    district: req.user.district,
    block: req.user.block,
    village: req.user.village,
    createdBy: req.user.id,
  });

  // Generate receipt and email
  await attachReceipt(donation);

  res.json({ success: true, donation });
});

// ── 3️⃣ Offline / cash donation (any logged-in user) ──
exports.createDonation = catchAsync(async (req, res, next) => {
  const { donorName, amount, purpose, type } = req.body;

  if (!amount || amount < 0) {
    return next(new AppError('Donation amount is required', 400));
  }

  const donation = await Donation.create({
    donorName: donorName || req.user.fullName,
    email: req.user.email,
    amount,
    purpose: purpose || 'Cash Donation',
    user: req.user.id,
    type: type || 'cash',
    state: req.user.state,
    district: req.user.district,
    block: req.user.block,
    village: req.user.village,
    createdBy: req.user.id,
  });

  // Generate receipt and email
  await attachReceipt(donation);

  res.status(201).json({ success: true, donation });
});

// ── 4️⃣ My donations ──
exports.getMyDonations = catchAsync(async (req, res, next) => {
  const donations = await Donation.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, donations });
});

// ── 5️⃣ NGO / Admin: GetAllDonations (scoped) ──
exports.getAllDonations = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, search } = req.query;
  const filter = { ...req.scopeFilter };
  if (search) {
    filter.$or = [
      { donorName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const donations = await Donation.find(filter)
    .sort({ createdAt: -1 })
    .populate('user', 'fullName email')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await Donation.countDocuments(filter);
  res.json({
    success: true,
    donations,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  });
});

// ── 6️⃣ NGO: Manual/offline donation entry (Admin / NGO) ──
exports.createCustomDonation = catchAsync(async (req, res, next) => {
  const { donorName, email, amount, purpose, date, type } = req.body;

  if (!amount || amount < 0) {
    return next(new AppError('Donation amount is required', 400));
  }

  const donation = await Donation.create({
    donorName,
    email,
    amount,
    purpose: purpose || 'Cash Donation',
    date: date || new Date(),
    type: type || 'cash',
    createdBy: req.user.id,
    state: req.user.state,
    district: req.user.district,
    block: req.user.block,
    village: req.user.village,
  });

  // Generate receipt and email
  await attachReceipt(donation);

  res.status(201).json({ success: true, donation });
});

// ── 7️⃣ Download receipt ──
exports.downloadReceipt = catchAsync(async (req, res, next) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation || !donation.receiptUrl) {
    return next(new AppError('Receipt not found', 404));
  }

  const filePath = path.join(__dirname, '../', donation.receiptUrl);
  if (!fs.existsSync(filePath)) {
    return next(new AppError('Receipt file not found', 404));
  }

  res.download(filePath, `donation_receipt_${donation._id}.pdf`);
});