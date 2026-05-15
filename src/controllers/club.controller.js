const Club = require('../models/Club');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ─── Helper: upgrade tier based on points ──────────────────
const TIER_THRESHOLDS = {
  Bronze: 0,
  Silver: 500,
  Gold: 2000,
  Platinum: 5000,
  Diamond: 10000,
  Elite: 25000,
  Crown: 50000,
};

const getTierForPoints = (points) => {
  if (points >= TIER_THRESHOLDS.Crown) return 'Crown';
  if (points >= TIER_THRESHOLDS.Elite) return 'Elite';
  if (points >= TIER_THRESHOLDS.Diamond) return 'Diamond';
  if (points >= TIER_THRESHOLDS.Platinum) return 'Platinum';
  if (points >= TIER_THRESHOLDS.Gold) return 'Gold';
  if (points >= TIER_THRESHOLDS.Silver) return 'Silver';
  return 'Bronze';
};

// ─── GET CLUB DASHBOARD ────────────────────────────────────
exports.getDashboard = catchAsync(async (req, res, next) => {
  let club = await Club.findOne({ member: req.user.id }).populate('member', 'fullName email profileImage');

  // Auto-create if not exists
  if (!club) {
    club = await Club.create({ member: req.user.id });
    club = await Club.findById(club._id).populate('member', 'fullName email profileImage');
  }

  // Optionally recalc tier
  const newTier = getTierForPoints(club.totalPoints);
  if (newTier !== club.tier) {
    club.tier = newTier;
    club.lastUpgradeDate = new Date();
    await club.save();
  }

  res.json({
    success: true,
    data: {
      club,
      nextTier: getNextTier(club.tier),
      progress: getProgress(club.tier, club.totalPoints),
      thresholds: TIER_THRESHOLDS,
    },
  });
});

// ─── GET TEAM (downline/referrals) ─────────────────────────
exports.getTeam = catchAsync(async (req, res, next) => {
  const members = await Club.find({ /* sponsor = req.user.id ? depends on MLM logic */ })
    .populate('member', 'fullName email profileImage')
    .select('tier totalPoints');

  // Simplified: fetch all club members (or based on referral)
  const allMembers = await Club.find()
    .populate('member', 'fullName email profileImage')
    .sort({ totalPoints: -1 })
    .limit(50);

  res.json({ success: true, data: allMembers });
});

// ─── GET LICENSES (dummy – club members don't sell licenses) ──
exports.getLicenses = catchAsync(async (req, res, next) => {
  // Club members may view their own license sales or something
  res.json({ success: true, data: [] });
});

// ─── GET COMMISSIONS ───────────────────────────────────────
exports.getCommissions = catchAsync(async (req, res, next) => {
  const club = await Club.findOne({ member: req.user.id });
  if (!club) return res.json({ success: true, data: { totalEarnings: 0, pendingRewards: 0 } });

  res.json({
    success: true,
    data: {
      totalEarnings: club.totalEarnings,
      pendingRewards: club.pendingRewards,
      currentPoints: club.currentPoints,
    },
  });
});

// ─── CLAIM REWARD ──────────────────────────────────────────
exports.claimReward = catchAsync(async (req, res, next) => {
  const club = await Club.findOne({ member: req.user.id });
  if (!club) throw new AppError('क्लब रिकॉर्ड नहीं मिला', 404);

  const { amount } = req.body;
  if (!amount || amount <= 0) throw new AppError('अमान्य राशि', 400);
  if (club.pendingRewards < amount) throw new AppError('अपर्याप्त रिवॉर्ड बैलेंस', 400);

  // Deduct from pending rewards
  club.pendingRewards -= amount;
  club.currentPoints -= amount; // or maintain separately
  await club.save();

  // Optionally credit wallet
  // await User.findByIdAndUpdate(req.user.id, { $inc: { walletBalance: amount } });

  res.json({ success: true, message: `₹${amount} रिवॉर्ड क्लेम कर लिया गया`, pendingRewards: club.pendingRewards });
});

// ─── ADMIN: UPDATE MEMBER TIER ─────────────────────────────
exports.updateMemberTier = catchAsync(async (req, res, next) => {
  const { memberId, tier } = req.body;
  if (!TIER_THRESHOLDS.hasOwnProperty(tier)) throw new AppError('अमान्य श्रेणी', 400);

  let club = await Club.findOne({ member: memberId });
  if (!club) {
    club = new Club({ member: memberId });
  }
  club.tier = tier;
  club.lastUpgradeDate = new Date();
  await club.save();

  res.json({ success: true, club });
});

// ─── HELPERS ───────────────────────────────────────────────
function getNextTier(currentTier) {
  const tiers = Object.keys(TIER_THRESHOLDS);
  const idx = tiers.indexOf(currentTier);
  if (idx === -1 || idx === tiers.length - 1) return null;
  return tiers[idx + 1];
}

function getProgress(tier, points) {
  const tiers = Object.keys(TIER_THRESHOLDS);
  const idx = tiers.indexOf(tier);
  if (idx === -1) return 100;
  const currentMin = TIER_THRESHOLDS[tier];
  const nextMin = TIER_THRESHOLDS[tiers[idx + 1]] || currentMin;
  if (nextMin === currentMin) return 100;
  return ((points - currentMin) / (nextMin - currentMin)) * 100;
}