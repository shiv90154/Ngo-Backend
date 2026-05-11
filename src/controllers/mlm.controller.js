// backend/src/controllers/mlm.controller.js
const User = require('../models/user.model');
const CommissionTransaction = require('../models/CommissionTransaction');
const { processPayout } = require('../services/mlmEngine');
const asyncHandler = require('express-async-handler');

// ── Get user's own downline (binary tree view) ──
exports.getDownline = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('fullName email teamSize leftChild rightChild')
    .populate('leftChild', 'fullName email')
    .populate('rightChild', 'fullName email');

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  res.json({
    success: true,
    downline: {
      user: {
        fullName: user.fullName,
        email: user.email,
        teamSize: user.teamSize || 0,
      },
      leftChild: user.leftChild || null,
      rightChild: user.rightChild || null,
    },
  });
});

// ── Get my earnings (total, pending, recent commissions) ──
exports.getMyEarnings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('totalIncentiveEarned incentivePayoutInfo');

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const recentCommissions = await CommissionTransaction.find({ user: req.user._id })
    .sort('-createdAt')
    .limit(20)
    .populate('sponsor', 'fullName');

  res.json({
    success: true,
    totalEarned: user.totalIncentiveEarned || 0,
    pendingCommission: user.incentivePayoutInfo?.pendingIncentive || 0,
    earnings: recentCommissions,
  });
});

// ── Full recursive network tree (My Network) ──
exports.getNetwork = asyncHandler(async (req, res) => {
  const buildTree = async (parentId) => {
    const children = await User.find({ sponsorId: parentId, isDeleted: false })
      .select('fullName email role referralCode totalIncentiveEarned teamSize')
      .lean();
    for (let child of children) {
      child.children = await buildTree(child._id);
    }
    return children;
  };

  const rootUser = await User.findById(req.user._id)
    .select('fullName email role referralCode totalIncentiveEarned teamSize')
    .lean();

  if (!rootUser) return res.status(404).json({ success: false, message: 'User not found' });

  rootUser.children = await buildTree(req.user._id);
  res.json({ success: true, network: rootUser });
});

// ── Admin: all commissions ──
exports.getCommissions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, userId } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (userId) filter.user = userId;

  const commissions = await CommissionTransaction.find(filter)
    .populate('user', 'fullName email')
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);
  const total = await CommissionTransaction.countDocuments(filter);

  res.json({
    success: true,
    commissions,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page)
  });
});

// ── Admin: manual payout for a user ──
exports.payoutUser = asyncHandler(async (req, res) => {
  const amount = await processPayout(req.params.userId);
  if (amount) {
    res.json({ success: true, message: `Payout of ₹${amount} processed` });
  } else {
    res.json({ success: false, message: 'No pending incentive' });
  }
});

// ── Admin: batch payout ──
exports.batchPayout = asyncHandler(async (req, res) => {
  const users = await User.find({ 'incentivePayoutInfo.pendingIncentive': { $gt: 0 } });
  let total = 0;
  for (const user of users) {
    const amount = await processPayout(user._id);
    total += amount || 0;
  }
  res.json({ success: true, message: `Batch payout completed. Total paid: ₹${total}`, count: users.length });
});