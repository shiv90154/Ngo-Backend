const Donation = require('../models/Donation');
const Beneficiary = require('../models/Beneficiary');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const Expense = require('../models/Expense');
const User = require('../models/user.model');
const LicensePurchase = require('../models/LicensePurchase');
const CommissionTransaction = require('../models/CommissionTransaction');

// @desc   Get dashboard stats (scoped)
exports.getDashboardStats = async (req, res) => {
  try {
    const filter = { ...req.scopeFilter };

    const [
      totalDonations,
      donationAmountResult,
      totalBeneficiaries,
      activeCampaigns,
      upcomingEvents,
      totalExpenses,
      totalMembers,
    ] = await Promise.all([
      Donation.countDocuments(filter),
      Donation.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Beneficiary.countDocuments(filter),
      Campaign.countDocuments({ ...filter, status: 'active' }),
      Event.countDocuments({ ...filter, eventDate: { $gte: new Date() } }),
      Expense.countDocuments(filter),
      // ✅ फ़िक्स: isActive + isDeleted का इस्तेमाल
      User.countDocuments({ ...filter, isActive: true, isDeleted: false }),
    ]);

    res.json({
      success: true,
      stats: {
        totalDonations,
        totalDonationAmount: donationAmountResult[0]?.total || 0,
        totalBeneficiaries,
        activeCampaigns,
        upcomingEvents,
        totalExpenses,
        totalMembers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get team members under the current user
exports.getTeam = async (req, res) => {
  try {
    const team = await User.find({ reportsTo: req.user._id, isDeleted: false })
      .select('fullName email phone role hierarchyLevel isActive');
    res.json({ success: true, team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get licenses sold by current user
exports.getLicenses = async (req, res) => {
  try {
    const purchases = await LicensePurchase.find({ soldBy: req.user._id })
      .populate('licenseType', 'name')
      .sort('-purchaseDate');
    res.json({ success: true, licenses: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get my commissions (using CommissionTransaction)
exports.getCommissions = async (req, res) => {
  try {
    const commissions = await CommissionTransaction.find({ user: req.user._id })
      .sort('-createdAt');
    res.json({ success: true, commissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Contributions placeholder (WeeklyContribution model not yet built)
exports.getContributions = async (req, res) => {
  try {
    // const WeeklyContribution = require('../models/WeeklyContribution');
    // const contributions = await WeeklyContribution.find({ gramVikasAdhikari: req.user._id }).sort('-date');
    // res.json({ success: true, contributions });
    res.json({ success: true, contributions: [] });   // placeholder
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Meetings placeholder (Meeting model not yet built)
exports.getMeetings = async (req, res) => {
  try {
    // const Meeting = require('../models/Meeting');
    // const meetings = await Meeting.find({ host: req.user._id }).sort('-startTime');
    // res.json({ success: true, meetings });
    res.json({ success: true, meetings: [] });         // placeholder
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};