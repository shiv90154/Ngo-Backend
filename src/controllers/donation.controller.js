const Donation = require('../models/Donation'); // model with fields: donorName, email, amount, purpose, date, state, district, block, village, type

exports.createDonation = async (req, res) => {
  try {
    const donation = await Donation.create({ ...req.body, user: req.user.id });
    res.status(201).json({ success: true, donation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, donations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllDonations = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = { ...req.scopeFilter };
    if (search) {
      filter.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const donations = await Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Donation.countDocuments(filter);
    res.json({ success: true, donations, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createCustomDonation = async (req, res) => {
  try {
    const { donorName, email, amount, purpose, date, type } = req.body;
    const donation = await Donation.create({
      donorName, email, amount, purpose, date, type,
      createdBy: req.user.id,
      ...req.scopeFilter, // attach location to donation
    });
    res.status(201).json({ success: true, donation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};