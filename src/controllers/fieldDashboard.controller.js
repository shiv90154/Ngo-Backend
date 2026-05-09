// backend/src/controllers/fieldDashboard.controller.js
const Donation = require('../models/Donation');
const Beneficiary = require('../models/Beneficiary');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const Expense = require('../models/Expense');
const User = require('../models/user.model');

// NOTE: यह फंक्शन अब getDashboardStats नाम से एक्सपोर्ट हो रहा है
exports.getDashboardStats = async (req, res) => {
  try {
    const filter = { ...req.scopeFilter };  // scopeFilter middleware से सेट हुआ

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
      User.countDocuments({ ...filter, membershipStatus: 'active' }),
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

// बाकी के फंक्शन (तेरी जरूरत के हिसाब से) – ये पहले जैसे ही रह सकते हैं
exports.getTeam = async (req, res) => {
  try {
    const team = await User.find({ reportsTo: req.user._id, isDeleted: false })
      .select('fullName email phone role hierarchyLevel isActive');
    res.json({ success: true, team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLicenses = async (req, res) => {
  try {
    const LicensePurchase = require('../models/LicensePurchase');
    const purchases = await LicensePurchase.find({ soldBy: req.user._id })
      .populate('licenseType', 'name')
      .sort('-purchaseDate');
    res.json({ success: true, licenses: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCommissions = async (req, res) => {
  try {
    const Transaction = require('../models/Transaction.model');
    const commissions = await Transaction.find({ user: req.user._id, type: 'commission' })
      .sort('-createdAt');
    res.json({ success: true, commissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getContributions = async (req, res) => {
  try {
    const WeeklyContribution = require('../models/WeeklyContribution');
    const contributions = await WeeklyContribution.find({ gramVikasAdhikari: req.user._id })
      .sort('-date');
    res.json({ success: true, contributions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMeetings = async (req, res) => {
  try {
    const Meeting = require('../models/Meeting');
    const meetings = await Meeting.find({ host: req.user._id })
      .sort('-startTime');
    res.json({ success: true, meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};