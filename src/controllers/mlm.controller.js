const User = require('../models/user.model');
const CommissionTransaction = require('../models/CommissionTransaction');
const { processPayout } = require('../services/commission.service');

// Admin: get commission report (all pending commissions)
exports.getCommissions = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, userId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (userId) query.user = userId;

    const commissions = await CommissionTransaction.find(query)
      .populate('user', 'fullName email')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await CommissionTransaction.countDocuments(query);
    res.json({ success: true, commissions, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Admin: trigger payout for a single user
exports.payoutUser = async (req, res) => {
  try {
    const amount = await processPayout(req.params.userId);
    if (amount) {
      res.json({ success: true, message: `Payout of ₹${amount} processed` });
    } else {
      res.json({ success: false, message: 'No pending commission' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Admin: batch payout for all eligible users
exports.batchPayout = async (req, res) => {
  try {
    const users = await User.find({ 'mlmPayoutInfo.pendingCommission': { $gt: 0 } });
    let total = 0;
    for (const user of users) {
      const amount = await processPayout(user._id);
      total += amount || 0;
    }
    res.json({ success: true, message: `Batch payout completed. Total paid: ₹${total}`, count: users.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Admin: tree view (get downline)
exports.getDownline = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const downline = await User.find({ sponsorId: userId, isDeleted: false })
      .select('fullName email mlmLevel hierarchyLevel totalCommissionEarned');
    res.json({ success: true, downline });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// User: my earnings summary
exports.getMyEarnings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('mlmPayoutInfo totalCommissionEarned commissionRate');
    const recentCommissions = await CommissionTransaction.find({ user: req.user.id })
      .sort('-createdAt')
      .limit(20)
      .populate('sponsor', 'fullName');  // the sponsor who gave the commission? Actually 'user' is the earner; we may populate 'sponsor' as the source.
    res.json({ success: true, earnings: { ...user.mlmPayoutInfo.toObject(), totalCommissionEarned: user.totalCommissionEarned, commissionRate: user.commissionRate, recentCommissions } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};