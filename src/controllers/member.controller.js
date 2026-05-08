const User = require('../models/user.model'); // reusing User model with membership fields

exports.getMembers = async (req, res) => {
  try {
    // Filter users who have a membershipStatus (custom field or role 'MEMBER')
    const members = await User.find({ role: 'USER', membershipStatus: { $exists: true } })
      .select('fullName email phone membershipStatus membershipDate referralCode')
      .sort({ createdAt: -1 });
    res.json({ success: true, members });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.blockMember = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { membershipStatus: 'blocked' }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, message: 'Member blocked' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.unblockMember = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { membershipStatus: 'active' }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, message: 'Member unblocked' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMemberIdCard = async (req, res) => {
  // Generate or return ID card URL
  res.json({ success: true, idCardUrl: '/id-cards/sample.pdf' });
};

exports.getMemberCertificate = async (req, res) => {
  // Return certificate details
  res.json({ success: true, certificateUrl: '/certificates/sample.pdf' });
};