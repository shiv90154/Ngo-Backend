const Campaign = require('../models/Campaign');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/sendEmail');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ---------- ADMIN: Create Campaign ----------
exports.createCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- ADMIN: Update Campaign ----------
exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- ADMIN: Get All Campaigns ----------
exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort('-createdAt').lean({ virtuals: true });
    res.json({ success: true, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- PUBLIC: Get Active Campaigns ----------
exports.getActiveCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      status: 'active',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).sort('-createdAt').lean({ virtuals: true });
    res.json({ success: true, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- USER: Donate to a Campaign ----------
exports.donateToCampaign = async (req, res) => {
  try {
    const { campaignId, amount, donorName, donorEmail } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Campaign is not active' });
    }

    // Update raised amount
    campaign.raisedAmount += Number(amount);
    await campaign.save();

    // Generate receipt
    const receiptData = {
      campaignId: campaign._id,
      campaignTitle: campaign.title,
      amount,
      donorName,
      donorEmail,
      date: new Date(),
    };
    const receiptUrl = await generateCampaignReceipt(receiptData);

    // Send email
    if (donorEmail) {
      await sendEmail({
        to: donorEmail,
        subject: `Donation Receipt - ${campaign.title}`,
        html: `<h2>Thank you for your donation of ₹${amount}!</h2>
               <p>Campaign: ${campaign.title}</p>
               <p>Your donation helps us reach our goal.</p>`,
        attachments: [{ filename: `receipt_${Date.now()}.pdf`, path: receiptUrl }],
      });
    }

    res.json({ success: true, campaign: campaign.toJSON({ virtuals: true }) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- HELPER: Generate Receipt PDF ----------
async function generateCampaignReceipt(data) {
  const receiptDir = path.join(__dirname, '..', 'uploads', 'campaign-receipts');
  if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });

  const pdfPath = path.join(receiptDir, `${Date.now()}.pdf`);
  const qrPath = path.join(receiptDir, `${Date.now()}_qr.png`);

  await QRCode.toFile(qrPath, `Campaign: ${data.campaignTitle}\nAmount: ₹${data.amount}\nDate: ${new Date().toLocaleDateString('en-IN')}`);

  const doc = new PDFDocument();
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  doc.fontSize(20).text('Samraddh Bharat Foundation', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text('Campaign Donation Receipt', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Campaign: ${data.campaignTitle}`);
  doc.text(`Donor: ${data.donorName || 'Anonymous'}`);
  doc.text(`Amount: ₹${data.amount}`);
  doc.text(`Date: ${new Date(data.date).toLocaleDateString('en-IN')}`);
  doc.moveDown();
  doc.image(qrPath, { fit: [100, 100], align: 'center' });
  doc.end();

  await new Promise(r => stream.on('finish', r));
  return pdfPath;
}