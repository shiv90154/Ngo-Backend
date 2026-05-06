const Donation = require('../models/Donation');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/sendEmail');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ---------- CREATE DONATION (User) ----------
exports.createDonation = async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId, purpose } = req.body;
    const donation = await Donation.create({
      donor: req.user.id,
      amount,
      paymentMethod,
      transactionId,
      purpose,
      createdBy: req.user.id,
    });

    // Generate receipt and QR
    await generateReceipt(donation);

    // Send email
    const user = await User.findById(req.user.id);
    await sendEmail({
      to: user.email,
      subject: 'Donation Receipt - Samraddh Bharat Foundation',
      html: `<h2>Thank you for your donation of ₹${amount}!</h2>
             <p>Your receipt is attached.</p>
             <p>Receipt ID: ${donation._id}</p>`,
      attachments: [{ filename: `receipt_${donation._id}.pdf`, path: donation.receiptUrl }],
    });
    donation.receiptEmailed = true;
    await donation.save();

    res.status(201).json({ success: true, donation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- CREATE CUSTOM DONATION (Admin) ----------
exports.createCustomDonation = async (req, res) => {
  try {
    const { donorEmail, donorName, amount, paymentMethod, purpose } = req.body;
    let donor = await User.findOne({ email: donorEmail });
    if (!donor) {
      // Optionally create a new user or just store name
      donor = await User.create({
        fullName: donorName || 'Anonymous Donor',
        email: donorEmail,
        phone: '0000000000',
        password: Math.random().toString(36).slice(2),
        role: 'USER',
        isVerified: true,
      });
    }
    const donation = await Donation.create({
      donor: donor._id,
      amount,
      paymentMethod,
      purpose,
      createdBy: req.user.id,
    });

    await generateReceipt(donation);

    // Send email to donor
    await sendEmail({
      to: donor.email,
      subject: 'Donation Receipt - Samraddh Bharat Foundation',
      html: `<h2>Thank you for your donation of ₹${amount}!</h2>`,
      attachments: [{ filename: `receipt_${donation._id}.pdf`, path: donation.receiptUrl }],
    });
    donation.receiptEmailed = true;
    await donation.save();

    res.status(201).json({ success: true, donation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- GET USER'S DONATIONS ----------
exports.getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user.id }).sort('-donationDate');
    res.json({ success: true, donations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- GET ALL DONATIONS (Admin) ----------
exports.getAllDonations = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentMethod } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const donations = await Donation.find(filter)
      .populate('donor', 'fullName email')
      .sort('-donationDate')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Donation.countDocuments(filter);
    res.json({ success: true, donations, totalPages: Math.ceil(total / limit), currentPage: Number(page), total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- GENERATE RECEIPT HELPER ----------
async function generateReceipt(donation) {
  const doc = new PDFDocument();
  const receiptPath = path.join(__dirname, '..', 'uploads', 'receipts', `${donation._id}.pdf`);
  const qrCodePath = path.join(__dirname, '..', 'uploads', 'receipts', `${donation._id}_qr.png`);

  if (!fs.existsSync(path.dirname(receiptPath))) {
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  }

  // Generate QR Code
  await QRCode.toFile(qrCodePath, `Donation ID: ${donation._id}\nAmount: ₹${donation.amount}`);

  // Build PDF
  doc.fontSize(20).text('Samraddh Bharat Foundation', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text('Donation Receipt', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Receipt ID: ${donation._id}`);
  doc.text(`Amount: ₹${donation.amount}`);
  doc.text(`Payment Method: ${donation.paymentMethod}`);
  doc.text(`Date: ${new Date(donation.donationDate).toLocaleDateString('en-IN')}`);
  doc.moveDown();
  doc.image(qrCodePath, { fit: [100, 100], align: 'center' });

  const stream = fs.createWriteStream(receiptPath);
  doc.pipe(stream);
  doc.end();

  await new Promise((resolve) => stream.on('finish', resolve));

  donation.receiptUrl = `/uploads/receipts/${donation._id}.pdf`;
  donation.qrCodeUrl = `/uploads/receipts/${donation._id}_qr.png`;
  await donation.save();
}

module.exports = exports;