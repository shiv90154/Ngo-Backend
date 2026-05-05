const mongoose = require('mongoose');
const User = require('../models/user.model');
const LicensePurchase = require('../models/LicensePurchase');
const CommissionLog = require('../models/CommissionLog');

// Helper: get all descendant user IDs (including self) for a given user
const getDescendantIds = async (userId) => {
  let ids = [userId];
  let queue = [userId];
  while (queue.length > 0) {
    const current = queue.shift();
    // find users who report to current
    const children = await User.find({ reportsTo: current }).select('_id');
    const childIds = children.map(c => c._id.toString());
    ids.push(...childIds);
    queue.push(...childIds);
  }
  return [...new Set(ids)]; // remove duplicates
};

// ─── Club Dashboard Stats ───
exports.getDashboard = async (req, res) => {
  try {
    const clubId = req.user.id;
    const descendantIds = await getDescendantIds(clubId); // includes club itself

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [teamSize, totalLicenses, monthlyLicenses, commissionLogs, totalEarnings] =
      await Promise.all([
        User.countDocuments({ reportsTo: { $in: descendantIds } }),
        LicensePurchase.countDocuments({ soldBy: { $in: descendantIds } }),
        LicensePurchase.countDocuments({
          soldBy: { $in: descendantIds },
          purchaseDate: { $gte: startOfMonth },
        }),
        CommissionLog.find({ userId: { $in: descendantIds } }).sort({ createdAt: -1 }).limit(10),
        CommissionLog.aggregate([
          { $match: { userId: { $in: descendantIds.map(id => new mongoose.Types.ObjectId(id)) } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

    const pendingCommission = await CommissionLog.aggregate([
      { $match: { userId: { $in: descendantIds.map(id => new mongoose.Types.ObjectId(id)) }, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      stats: {
        teamSize,
        totalLicenses,
        monthlyLicenses,
        totalEarnings: totalEarnings[0]?.total || 0,
        pendingCommission: pendingCommission[0]?.total || 0,
      },
      recentCommissions: commissionLogs,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Downline Team ───
exports.getTeam = async (req, res) => {
  try {
    const clubId = req.user.id;
    const descendants = await User.find({ reportsTo: clubId })
      .select('fullName email phone role licenseStats walletBalance')
      .lean();
    res.json({ success: true, members: descendants });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── License Sales (downline) ───
exports.getLicenseSales = async (req, res) => {
  try {
    const clubId = req.user.id;
    const descendantIds = await getDescendantIds(clubId);
    const purchases = await LicensePurchase.find({ soldBy: { $in: descendantIds } })
      .sort({ purchaseDate: -1 })
      .populate('soldBy', 'fullName email')
      .populate('licenseType', 'name incentiveAmount')
      .lean();
    res.json({ success: true, purchases });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Commission Logs (downline) ───
exports.getCommissions = async (req, res) => {
  try {
    const clubId = req.user.id;
    const descendantIds = await getDescendantIds(clubId);
    const commissions = await CommissionLog.find({ userId: { $in: descendantIds } })
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName email')
      .populate('purchase')
      .lean();
    res.json({ success: true, commissions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};