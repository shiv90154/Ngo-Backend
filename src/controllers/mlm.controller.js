// backend/src/controllers/mlm.controller.js
const User = require('../models/user.model');
const CommissionTransaction = require('../models/CommissionTransaction');
const CommissionLog = require('../models/CommissionLog');
const { processPayout } = require('../services/mlmEngine');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ── Get user's own downline (binary tree view) ──
exports.getDownline = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('fullName email teamSize leftChild rightChild')
    .populate('leftChild', 'fullName email role teamSize')
    .populate('rightChild', 'fullName email role teamSize');

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Also get direct downline members
  const directMembers = await User.find({ sponsorId: req.user._id, isDeleted: false })
    .select('fullName email role teamSize referralCode')
    .lean();

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
      directMembers,
      totalTeamSize: user.teamSize || 0,
    },
  });
});

// ── Get my earnings (total, pending, recent commissions) ──
exports.getMyEarnings = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('totalIncentiveEarned incentivePayoutInfo walletBalance licenseStats');

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Get recent commissions from both CommissionTransaction and CommissionLog
  const recentCommissions = await CommissionTransaction.find({ user: req.user._id })
    .sort('-createdAt')
    .limit(20)
    .lean();

  const commissionLogs = await CommissionLog.find({ user: req.user._id })
    .sort('-createdAt')
    .limit(20)
    .populate('fromUser', 'fullName')
    .lean();

  res.json({
    success: true,
    data: {
      totalEarned: user.totalIncentiveEarned || 0,
      pendingPayout: user.incentivePayoutInfo?.pendingIncentive || 0,
      walletBalance: user.walletBalance || 0,
      totalLicensesSold: user.licenseStats?.totalLicensesSold || 0,
      recentTransactions: recentCommissions,
      commissionLogs,
    }
  });
});

// ── Full recursive network tree (My Network) ──
exports.getNetwork = catchAsync(async (req, res) => {
  const buildTree = async (parentId, depth = 0) => {
    if (depth > 10) return []; // Safety limit

    const children = await User.find({ sponsorId: parentId, isDeleted: false })
      .select('fullName email role state district referralCode totalIncentiveEarned teamSize hierarchyLevel')
      .lean();

    const tree = [];
    for (const child of children) {
      const subTree = await buildTree(child._id, depth + 1);
      tree.push({ ...child, children: subTree });
    }
    return tree;
  };

  const rootUser = await User.findById(req.user._id)
    .select('fullName email role state district referralCode totalIncentiveEarned teamSize hierarchyLevel')
    .lean();

  if (!rootUser) return res.status(404).json({ success: false, message: 'User not found' });

  rootUser.children = await buildTree(req.user._id);

  res.json({ success: true, network: rootUser });
});

// ── Admin: all commissions (with filters) ──
exports.getCommissions = catchAsync(async (req, res) => {
  const { page = 1, limit = 50, status, userId, type, search } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (userId) filter.user = userId;
  if (type) filter.type = type;

  // If search is provided, first find matching users
  if (search) {
    const matchingUsers = await User.find({
      fullName: { $regex: search, $options: 'i' }
    }).select('_id');
    filter.user = { $in: matchingUsers.map(u => u._id) };
  }

  const commissions = await CommissionTransaction.find(filter)
    .populate('user', 'fullName email role')
    .populate('sponsor', 'fullName email')
    .sort('-createdAt')
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

  const total = await CommissionTransaction.countDocuments(filter);

  res.json({
    success: true,
    commissions,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    total
  });
});

// ── Admin: manual payout for a user ──
exports.payoutUser = catchAsync(async (req, res) => {
  const amount = await processPayout(req.params.userId);
  if (amount) {
    res.json({ success: true, message: `Payout of ₹${amount} processed successfully` });
  } else {
    res.status(400).json({ success: false, message: 'No pending incentive to payout' });
  }
});

// ── Admin: batch payout ──
exports.batchPayout = catchAsync(async (req, res) => {
  const users = await User.find({
    'incentivePayoutInfo.pendingIncentive': { $gt: 0 }
  });

  if (users.length === 0) {
    return res.json({ success: true, message: 'No users with pending incentives', count: 0, totalPaid: 0 });
  }

  let totalPaid = 0;
  let count = 0;

  for (const user of users) {
    const amount = await processPayout(user._id);
    if (amount) {
      totalPaid += amount;
      count++;
    }
  }

  res.json({
    success: true,
    message: `Batch payout completed. ${count} users paid.`,
    count,
    totalPaid
  });
});