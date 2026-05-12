const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ── GET MEMBERS (scoped) ─────────────────────────────
exports.getMembers = catchAsync(async (req, res) => {
  const filter = {
    ...req.scopeFilter,
    role: 'USER',           // सिर्फ़ आम सदस्य
    isDeleted: false        // सॉफ्ट-डिलीट न दिखाएँ
  };

  const users = await User.find(filter)
    .select('fullName email phone isActive createdAt referralCode')
    .sort('-createdAt');

  const members = users.map(user => ({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    membershipStatus: user.isActive ? 'active' : 'blocked',
    membershipFee: 0,
    membershipDate: user.createdAt,
    referralCode: user.referralCode,
  }));

  res.json({ success: true, members });
});

// ── ADD MEMBER ───────────────────────────────────────
exports.addMember = catchAsync(async (req, res, next) => {
  const { fullName, email, phone, password, state, district, block, village } = req.body;

  if (!fullName || !email || !phone || !password) {
    return next(new AppError('कृपया नाम, ईमेल, फोन और पासवर्ड भरें', 400));
  }

  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) {
    return next(new AppError('इस ईमेल या फोन से पहले से सदस्य मौजूद है', 400));
  }

  // User model pre-save hook automatically hashes password
  const user = await User.create({
    fullName,
    email,
    phone,
    password,                     // बिना मैन्युअल हैश के – मॉडल कर लेगा
    role: 'USER',
    isActive: true,
    isVerified: true,             // ऑर्गनाइज़ेशन द्वारा जोड़ा गया, सीधे वेरिफाइड
    state: state || req.user.state,
    district: district || req.user.district,
    block: block || req.user.block,
    village: village || req.user.village,
    createdBy: req.user._id,
  });

  const member = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    membershipStatus: 'active',
    membershipFee: 0,
    membershipDate: user.createdAt,
    referralCode: user.referralCode,
  };

  res.status(201).json({ success: true, member });
});

// ── BLOCK / UNBLOCK ──────────────────────────────────
exports.blockMember = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!user) return next(new AppError('Member not found', 404));
  res.json({ success: true, message: 'Member blocked' });
});

exports.unblockMember = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: true, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!user) return next(new AppError('Member not found', 404));
  res.json({ success: true, message: 'Member unblocked' });
});

// ── ID CARD & CERTIFICATE (placeholder) ──────────────
exports.getMemberIdCard = catchAsync(async (req, res) => {
  // TODO: Generate actual ID card PDF
  res.json({ success: true, idCardUrl: '/id-cards/sample.pdf' });
});

exports.getMemberCertificate = catchAsync(async (req, res) => {
  // TODO: Generate certificate
  res.json({ success: true, certificateUrl: '/certificates/sample.pdf' });
});