// backend/src/controllers/member.controller.js
const User = require('../models/user.model');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');

// ── GET MEMBERS (scoped) ─────────────────────────────
exports.getMembers = asyncHandler(async (req, res) => {
  const filter = { ...req.scopeFilter, role: 'USER', isDeleted: false };

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
exports.addMember = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, state, district, block, village } = req.body;
  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: 'कृपया नाम, ईमेल, फोन और पासवर्ड भरें' });
  }

  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) {
    return res.status(400).json({ success: false, message: 'इस ईमेल या फोन से पहले से सदस्य है' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    fullName,
    email,
    phone,
    password: hashedPassword,
    role: 'USER',
    isActive: true,
    isVerified: true,
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
exports.blockMember = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'Member not found' });
  res.json({ success: true, message: 'Member blocked' });
});

exports.unblockMember = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'Member not found' });
  res.json({ success: true, message: 'Member unblocked' });
});

// ── ID CARD & CERTIFICATE (dummy) ────────────────────
exports.getMemberIdCard = asyncHandler(async (req, res) => {
  res.json({ success: true, idCardUrl: '/id-cards/sample.pdf' });
});

exports.getMemberCertificate = asyncHandler(async (req, res) => {
  res.json({ success: true, certificateUrl: '/certificates/sample.pdf' });
});