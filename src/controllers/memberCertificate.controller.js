const MemberCertificate = require('../models/MemberCertificate');
const User = require('../models/user.model');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { sendEmail } = require('../utils/sendEmail');
const { v4: uuidv4 } = require('uuid');

// ---------- GENERATE CERTIFICATE (Admin) ----------
exports.generateCertificate = async (req, res) => {
  try {
    const { memberId, type, template, notes } = req.body;

    const member = await User.findById(memberId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const verificationCode = uuidv4().slice(0, 12).toUpperCase();

    const certificate = await MemberCertificate.create({
      member: memberId,
      type,
      template: template || 1,
      issuedBy: req.user.id,
      verificationCode,
      notes,
    });

    // Generate PDF and QR
    const result = await generatePDF(certificate, member);

    certificate.certificateUrl = result.pdfUrl;
    certificate.qrCodeUrl = result.qrUrl;
    await certificate.save();

    // Send email
    await sendEmail({
      to: member.email,
      subject: `Your ${type.replace(/_/g, ' ')} is ready - Samraddh Bharat Foundation`,
      html: `<h2>Congratulations!</h2>
             <p>Your ${type.replace(/_/g, ' ')} has been issued.</p>
             <p>Verification Code: <strong>${verificationCode}</strong></p>
             <p>Scan the QR code on your certificate to verify.</p>`,
      attachments: [{ filename: `${type}_${member._id}.pdf`, path: certificate.certificateUrl }],
    });

    res.status(201).json({ success: true, certificate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- GET MEMBER'S CERTIFICATES ----------
exports.getMyCertificates = async (req, res) => {
  try {
    const certificates = await MemberCertificate.find({ member: req.user.id })
      .sort('-issuedAt')
      .populate('issuedBy', 'fullName')
      .lean();
    res.json({ success: true, certificates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- VERIFY CERTIFICATE VIA QR ----------
exports.verifyCertificate = async (req, res) => {
  try {
    const { verificationCode } = req.params;
    const certificate = await MemberCertificate.findOne({ verificationCode })
      .populate('member', 'fullName email')
      .populate('issuedBy', 'fullName')
      .lean();

    if (!certificate) return res.status(404).json({ success: false, message: 'Invalid verification code' });

    res.json({
      success: true,
      verified: true,
      certificate: {
        memberName: certificate.member?.fullName,
        type: certificate.type,
        issuedBy: certificate.issuedBy?.fullName,
        issuedAt: certificate.issuedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- GET ALL CERTIFICATES (Admin) ----------
exports.getAllCertificates = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const filter = {};
    if (type) filter.type = type;

    const certificates = await MemberCertificate.find(filter)
      .populate('member', 'fullName email')
      .populate('issuedBy', 'fullName')
      .sort('-issuedAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await MemberCertificate.countDocuments(filter);
    res.json({
      success: true,
      certificates,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- HELPER: Generate PDF + QR ----------
async function generatePDF(certificate, member) {
  const receiptDir = path.join(__dirname, '..', 'uploads', 'certificates');
  if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });

  const pdfPath = path.join(receiptDir, `${certificate._id}.pdf`);
  const qrPath = path.join(receiptDir, `${certificate._id}_qr.png`);

  // QR Code
  await QRCode.toFile(qrPath, `Verification: ${certificate.verificationCode}`);

  // PDF
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  doc.fontSize(24).text('Samraddh Bharat Foundation', { align: 'center' });
  doc.moveDown();
  doc.fontSize(16).text(certificate.type.replace(/_/g, ' ').toUpperCase(), { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`This is to certify that ${member.fullName} is a registered member.`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Verification Code: ${certificate.verificationCode}`, { align: 'center' });
  doc.moveDown();
  doc.image(qrPath, { fit: [120, 120], align: 'center' });
  doc.end();

  await new Promise(r => stream.on('finish', r));

  return {
    pdfUrl: `/uploads/certificates/${certificate._id}.pdf`,
    qrUrl: `/uploads/certificates/${certificate._id}_qr.png`,
  };
}