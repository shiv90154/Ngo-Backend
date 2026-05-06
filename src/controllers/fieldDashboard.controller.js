const mongoose = require('mongoose');
const User = require('../models/user.model');
const LicensePurchase = require('../models/LicensePurchase');
const CommissionLog = require('../models/CommissionLog');
const WeeklyContribution = require('../models/WeeklyContribution');
const Meeting = require('../models/Meeting');

// Helper: get all descendant user IDs (including self)
const getDescendantIds = async (userId) => {
  let ids = [userId.toString()];
  let queue = [userId.toString()];
  while (queue.length > 0) {
    const current = queue.shift();
    const children = await User.find({ reportsTo: current }).select('_id');
    const childIds = children.map(c => c._id.toString());
    ids.push(...childIds);
    queue.push(...childIds);
  }
  return [...new Set(ids)];
};



// ─── Team ───
exports.getTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamIds = await getDescendantIds(userId);
    const members = await User.find({ reportsTo: { $in: teamIds } })
      .select('fullName email phone role licenseStats walletBalance')
      .lean();
    res.json({ success: true, members });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Licenses (downline) ───
exports.getLicenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamIds = await getDescendantIds(userId);
    const purchases = await LicensePurchase.find({ soldBy: { $in: teamIds } })
      .sort('-purchaseDate')
      .populate('soldBy', 'fullName')
      .populate('licenseType', 'name incentiveAmount')
      .limit(50)
      .lean();
    res.json({ success: true, purchases });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Commissions (downline) ───
exports.getCommissions = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamIds = await getDescendantIds(userId);
    const commissions = await CommissionLog.find({ userId: { $in: teamIds.map(id => new mongoose.Types.ObjectId(id)) } })
      .sort('-createdAt')
      .populate('userId', 'fullName')
      .limit(50)
      .lean();
    res.json({ success: true, commissions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Weekly Contributions ───
exports.getContributions = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamIds = await getDescendantIds(userId);
    const contributions = await WeeklyContribution.find({ gramVikasAdhikari: { $in: teamIds } })
      .sort('-date')
      .populate('gramVikasAdhikari', 'fullName')
      .limit(50)
      .lean();
    res.json({ success: true, contributions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Meetings ───
exports.getMeetings = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamIds = await getDescendantIds(userId);
    const meetings = await Meeting.find({ host: { $in: teamIds } })
      .sort('-startTime')
      .populate('host', 'fullName')
      .limit(50)
      .lean();
    res.json({ success: true, meetings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// ======================
// GET /api/dashboard/stats
// ======================
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // All users under this officer (including the officer)
    const teamIds = await getDescendantIds(userId);
    const teamMongoIds = teamIds.map(id => new mongoose.Types.ObjectId(id));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      teamSize,              // excluding self
      totalLicenses,
      monthlyLicenses,
      totalContributions,
      totalMeetings,
      recentLicenses,
      recentCommissions,
    ] = await Promise.all([
      User.countDocuments({ reportsTo: { $in: teamIds } }),
      LicensePurchase.countDocuments({ soldBy: { $in: teamIds } }),
      LicensePurchase.countDocuments({
        soldBy: { $in: teamIds },
        purchaseDate: { $gte: startOfMonth },
      }),
      WeeklyContribution.countDocuments({ gramVikasAdhikari: { $in: teamIds } }),
      Meeting.countDocuments({ host: { $in: teamIds } }),
      LicensePurchase.find({ soldBy: { $in: teamIds } })
        .sort('-purchaseDate')
        .limit(5)
        .populate('soldBy', 'fullName')
        .populate('licenseType', 'name')
        .lean(),
      CommissionLog.find({ userId: { $in: teamMongoIds } })
        .sort('-createdAt')
        .limit(5)
        .populate('userId', 'fullName')
        .lean(),
    ]);

    // Aggregate total earnings and pending commissions
    const [earningsData, pendingData] = await Promise.all([
      CommissionLog.aggregate([
        { $match: { userId: { $in: teamMongoIds } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      CommissionLog.aggregate([
        { $match: { userId: { $in: teamMongoIds }, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        teamSize,
        totalLicenses,
        monthlyLicenses,
        totalEarnings: earningsData[0]?.total || 0,
        pendingCommission: pendingData[0]?.total || 0,
        totalContributions,
        totalMeetings,
      },
      recentActivity: {
        licenses: recentLicenses,
        commissions: recentCommissions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};