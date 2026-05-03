const Donation = require('../models/Donation');
const User = require('../models/user.model.js');

// ═══════════════ DONOR ═══════════════

// @desc    Create new donation (with optional payment proof image)
// @route   POST /api/donations
// @access  Private
exports.createDonation = async (req, res) => {
  try {
    const { amount, paymentMethod, message, paymentProofImage } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    let proofImage = paymentProofImage || null;

    // Agar multer se file aayi ho (req.file)
    if (req.file) {
      // Maan lo aap cloudinary ya kisi aur service par upload kar rahe ho
      proofImage = req.file.path;  // ya req.file.location (S3)
    }

    // For UPI/CASH, image is mandatory
    if (['UPI', 'CASH'].includes(paymentMethod || 'UPI') && !proofImage) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof image is required for UPI/Cash donations'
      });
    }

    const donation = await Donation.create({
      donor: req.user._id,
      amount,
      paymentMethod: paymentMethod || 'UPI',
      message: message || '',
      status: proofImage ? 'PENDING_VERIFICATION' : 'PENDING',
      paymentProofImage: proofImage
    });

    res.status(201).json({ success: true, data: donation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged-in user's donations
// @route   GET /api/donations/my
// @access  Private
exports.getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .sort({ donatedAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: donations.length, data: donations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single donation detail (donor ya admin)
// @route   GET /api/donations/:id
// @access  Private
exports.getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'fullName email phone')
      .populate('acknowledgedBy', 'fullName')
      .lean();

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    // Authorization: sirf donation ka donor ya admin dekh sakta hai
    const isOwner = donation.donor._id.toString() === req.user._id.toString();
    const isAdmin = ['SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.status(200).json({ success: true, data: donation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════ ADMIN ═══════════════

// @desc    Get all donations (admin)
// @route   GET /api/donations/admin/all
// @access  Private/Admin
exports.getAllDonations = async (req, res) => {
  try {
    const { startDate, endDate, status, search } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.donatedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status) filter.status = status;

    let donationQuery = Donation.find(filter)
      .populate('donor', 'fullName email phone role')
      .populate('acknowledgedBy', 'fullName');

    // Search by donor name
    if (search) {
      const users = await User.find({
        fullName: { $regex: search, $options: 'i' }
      }).select('_id');
      donationQuery = donationQuery.where('donor').in(users.map(u => u._id));
    }

    const donations = await donationQuery.sort({ donatedAt: -1 }).lean();

    res.status(200).json({ success: true, count: donations.length, data: donations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify a pending donation (mark as SUCCESS)
// @route   PUT /api/donations/:id/verify
// @access  Private/Admin
exports.verifyDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({
        success: false,
        message: `Donation status must be PENDING_VERIFICATION, current: ${donation.status}`
      });
    }

    // Generate receipt URL (yahan aap actual PDF generate karke cloud link set karenge)
    if (!donation.receiptUrl) {
      // Dummy URL, replace with actual receipt generation logic
      donation.receiptUrl = `https://your-storage.com/receipts/${donation.receiptNumber}.pdf`;
    }

    donation.status = 'SUCCESS';
    donation.acknowledgedBy = req.user._id;
    donation.acknowledgedAt = new Date();

    await donation.save();

    // Donor ke last donation fields update karo
    await User.findByIdAndUpdate(donation.donor, {
      lastDonationAmount: donation.amount,
      lastDonationAt: donation.donatedAt,
      lastDonationReceiptUrl: donation.receiptUrl
    });

    res.status(200).json({ success: true, data: donation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject a pending donation
// @route   PUT /api/donations/:id/reject
// @access  Private/Admin
exports.rejectDonation = async (req, res) => {
  try {
    const { reason } = req.body;
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({
        success: false,
        message: 'Only pending verification donations can be rejected'
      });
    }

    donation.status = 'FAILED';
    donation.message = reason 
      ? `${donation.message ? donation.message + ' | ' : ''}Rejected: ${reason}` 
      : donation.message;

    await donation.save();

    res.status(200).json({ success: true, data: donation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Acknowledge (already successful donation) – optional
// @route   PUT /api/donations/:id/acknowledge
// @access  Private/Admin
exports.acknowledgeDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.status !== 'SUCCESS') {
      return res.status(400).json({ success: false, message: 'Only successful donations can be acknowledged' });
    }

    donation.acknowledgedBy = req.user._id;
    donation.acknowledgedAt = new Date();
    await donation.save();

    res.status(200).json({ success: true, data: donation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════ PAYMENT GATEWAY CALLBACK (optional) ═══════════════

// @desc    Handle payment gateway webhook
// @route   POST /api/donations/payment-callback
// @access  Public (verify signature in production)
exports.paymentCallback = async (req, res) => {
  try {
    const { donationId, transactionId, status, paymentResponse } = req.body;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (transactionId) donation.transactionId = transactionId;

    if (status === 'SUCCESS') {
      donation.status = 'SUCCESS';
      if (!donation.receiptUrl) {
        donation.receiptUrl = `https://your-storage.com/receipts/${donation.receiptNumber}.pdf`;
      }
      // Update donor
      await User.findByIdAndUpdate(donation.donor, {
        lastDonationAmount: donation.amount,
        lastDonationAt: donation.donatedAt,
        lastDonationReceiptUrl: donation.receiptUrl
      });
    } else if (status === 'FAILED') {
      donation.status = 'FAILED';
    }

    await donation.save();
    res.status(200).json({ success: true, data: donation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════ RECEIPT DOWNLOAD ═══════════════

// @desc    Download/View donation receipt
// @route   GET /api/donations/:id/receipt
// @access  Private (donor or admin)
exports.downloadReceipt = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation || !donation.receiptUrl) {
      return res.status(404).json({ success: false, message: 'Receipt not available' });
    }

    const isOwner = donation.donor.toString() === req.user._id.toString();
    const isAdmin = ['SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Redirect to cloud URL (ya aap stream bhi kar sakte ho)
    res.redirect(donation.receiptUrl);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};