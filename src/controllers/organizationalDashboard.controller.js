const Donation = require('../models/Donation');
const Beneficiary = require('../models/Beneficiary');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const Expense = require('../models/Expense');
const User = require('../models/user.model');

exports.getStats = async (req, res) => {
  try {
    const filter = { ...req.scopeFilter };

    const [
      totalDonations,
      donationAmount,
      totalBeneficiaries,
      activeCampaigns,
      upcomingEvents,
      totalExpenses,
      totalMembers,
    ] = await Promise.all([
      Donation.countDocuments(filter),
      Donation.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
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
        totalDonationAmount: donationAmount[0]?.total || 0,
        totalBeneficiaries,
        activeCampaigns,
        upcomingEvents,
        totalExpenses,
        totalMembers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};