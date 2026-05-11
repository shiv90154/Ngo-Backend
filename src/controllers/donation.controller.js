// backend/src/controllers/donation.controller.js
const Donation = require('../models/Donation');
const asyncHandler = require('express-async-handler');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── 1️⃣ Create Razorpay order for online donation ──
exports.createDonationOrder = asyncHandler(async (req, res) => {
  const { amount } = req.body; // in INR
  if (!amount || amount < 1) {
    return res.status(400).json({ success: false, message: 'राशि आवश्यक है' });
  }

  const options = {
    amount: amount * 100, // convert to paise
    currency: 'INR',
    receipt: `donation_${Date.now()}`,
    notes: {
      userId: req.user.id,
      purpose: req.body.purpose || 'दान',
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

// ── 2️⃣ Verify payment & record donation ──
exports.verifyDonationPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    donorName,
    purpose,
    amount,
  } = req.body;

  // Verify signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Invalid payment signature' });
  }

  // Create donation record
  const donation = await Donation.create({
    donorName: donorName || req.user.fullName,
    email: req.user.email,
    amount: amount || req.body.amount / 100,   // fallback
    purpose: purpose || 'ऑनलाइन दान',
    user: req.user.id,
    type: 'online',
    transactionId: razorpay_payment_id,
    state: req.user.state,
    district: req.user.district,
    block: req.user.block,
    village: req.user.village,
    createdBy: req.user.id,
  });

  // Optional: trigger incentive (if you want to reward donor's sponsor chain)
  // const { calculateCommission } = require('../services/incentiveEngine');
  // await calculateCommission(req.user.id, amount, 'donation', donation._id);

  res.json({ success: true, donation });
});

// ── PUBLIC: Any logged‑in user can donate (offline/cash mode is handled here too) ──
exports.createDonation = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.user = req.user.id;
  // If it's a cash donation (offline), scope fields can be added from scopeFilter middleware (used in routes)
  data.state = req.user.state;
  data.district = req.user.district;
  data.block = req.user.block;
  data.village = req.user.village;
  const donation = await Donation.create(data);
  res.status(201).json({ success: true, donation });
});

// ── MY DONATIONS ──
exports.getMyDonations = asyncHandler(async (req, res) => {
  const donations = await Donation.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, donations });
});

// ── NGO / ADMIN: Scoped donations ──
exports.getAllDonations = asyncHandler(async (req, res) => {
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

// ── NGO: Manual / offline donation entry ──
exports.createCustomDonation = asyncHandler(async (req, res) => {
  const { donorName, email, amount, purpose, date, type } = req.body;
  const donation = await Donation.create({
    donorName,
    email,
    amount,
    purpose,
    date: date || new Date(),
    type: type || 'cash',
    createdBy: req.user.id,
    state: req.user.state,
    district: req.user.district,
    block: req.user.block,
    village: req.user.village,
  });
  res.status(201).json({ success: true, donation });
});