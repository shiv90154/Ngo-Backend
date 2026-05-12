const Campaign = require('../models/Campaign');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendEmailWithAttachment } = require('../utils/sendEmail');  // ✅ नया फ़ंक्शन
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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

// ---------- ADMIN: Create Campaign ----------
exports.createCampaign = catchAsync(async (req, res) => {
  const campaign = await Campaign.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ success: true, campaign });
});

// ---------- ADMIN: Update Campaign ----------
exports.updateCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!campaign) {
    return next(new AppError('Campaign not found', 404));
  }
  res.json({ success: true, campaign });
});

// ---------- ADMIN/All: Get All Campaigns ----------
exports.getAllCampaigns = catchAsync(async (req, res) => {
  const campaigns = await Campaign.find().sort('-createdAt').lean({ virtuals: true });
  res.json({ success: true, campaigns });
});

// ---------- PUBLIC: Get Active Campaigns ----------
exports.getActiveCampaigns = catchAsync(async (req, res) => {
  const campaigns = await Campaign.find({
    status: 'active',
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  }).sort('-createdAt').lean({ virtuals: true });
  res.json({ success: true, campaigns });
});

// ---------- USER: Donate to a Campaign ----------
exports.donateToCampaign = catchAsync(async (req, res, next) => {
  const { campaignId, amount, donorName, donorEmail } = req.body;

  if (!campaignId || !amount || amount <= 0) {
    return next(new AppError('कैम्पेन ID और मान्य राशि आवश्यक है', 400));
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign || campaign.status !== 'active') {
    return next(new AppError('Campaign is not active or not found', 400));
  }

  // Update collected amount (sahi field name: collectedAmount)
  campaign.collectedAmount += Number(amount);
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

  // Send email with attachment (if donorEmail provided)
  if (donorEmail) {
    await sendEmailWithAttachment({
      to: donorEmail,
      subject: `Donation Receipt - ${campaign.title}`,
      html: `<h2>Thank you for your donation of ₹${amount}!</h2>
             <p>Campaign: ${campaign.title}</p>
             <p>Your donation helps us reach our goal.</p>`,
      attachments: [{ filename: `receipt_${Date.now()}.pdf`, path: receiptUrl }],
    });
  }

  res.json({ success: true, campaign: campaign.toJSON({ virtuals: true }) });
});