const Donation = require('../models/Donation');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── 1️⃣ Create Razorpay order for online donation ──
exports.createDonationOrder = catchAsync(async (req, res, next) => {
  const { amount } = req.body; // amount in INR
  if (!amount || amount < 1) {
    return next(new AppError('दान की राशि आवश्यक है', 400));
  }

  const options = {
    amount: amount * 100, // paise
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

// ── 2️⃣ Verify payment & record online donation ──
exports.verifyDonationPayment = catchAsync(async (req, res, next) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    donorName,
    purpose,
    amount,          // INR amount (from frontend)
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
    return next(new AppError('सभी पेमेंट डिटेल आवश्यक हैं', 400));
  }

  // Verify signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return next(new AppError('Invalid payment signature', 400));
  }

  // Create donation record
  const donation = await Donation.create({
    donorName: donorName || req.user.fullName,
    email: req.user.email,
    amount,              // INR
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

  // Optional: trigger incentive for donor's sponsor chain (uncomment if needed)
  // const { calculateCommission } = require('../services/mlmEngine');
  // await calculateCommission(req.user.id, amount, 'donation', donation._id);

  res.json({ success: true, donation });
});

// ── 3️⃣ Offline / cash donation (any logged-in user) ──
exports.createDonation = catchAsync(async (req, res, next) => {
  const { donorName, amount, purpose, type } = req.body;

  if (!amount || amount < 0) {
    return next(new AppError('दान की राशि आवश्यक है', 400));
  }

  const donation = await Donation.create({
    donorName: donorName || req.user.fullName,
    email: req.user.email,
    amount,
    purpose: purpose || 'नकद दान',
    user: req.user.id,
    type: type || 'cash',          // default to cash
    state: req.user.state,
    district: req.user.district,
    block: req.user.block,
    village: req.user.village,
    createdBy: req.user.id,
  });

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
    return next(new AppError('दान की राशि आवश्यक है', 400));
  }

  const donation = await Donation.create({
    donorName,
    email,
    amount,
    purpose: purpose || 'नकद दान',
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