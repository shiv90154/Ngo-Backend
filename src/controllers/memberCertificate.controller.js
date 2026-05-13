const MemberCertificate = require('../models/MemberCertificate');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { generateCertificate } = require('../services/certificateGenerator');

// @desc   Generate a new certificate (PDF)
// @route  POST /api/member-certificates/generate
exports.generateCertificate = catchAsync(async (req, res, next) => {
  const { memberName, certificateType, customMessage } = req.body;

  if (!memberName || !certificateType) {
    return next(new AppError('Member name and certificate type are required', 400));
  }

  // Generate PDF
  const result = await generateCertificate({
    recipientName: memberName,
    certificateType,
    issueDate: new Date(),
    customMessage: customMessage || '',
  });

  // Save to DB with PDF URL
const certificate = await MemberCertificate.create({
  memberName,
  certificateType,
  customMessage: customMessage || '',

  verificationCode: result.verificationCode,

  issuedBy: req.user.id,
  state: req.user.state,
  district: req.user.district,
  block: req.user.block,
  village: req.user.village,

  certificateUrl: result.certificateUrl,
});

  res.status(201).json({ success: true, certificate });
});

// @desc   Get all certificates (Admin/NGO)
// @route  GET /api/member-certificates/all
exports.getAllCertificates = catchAsync(async (req, res) => {
  const certificates = await MemberCertificate.find()
    .sort('-issuedDate')
    .populate('issuedBy', 'fullName email');
  res.json({ success: true, certificates });
});

// @desc   Get certificates issued by me
// @route  GET /api/member-certificates/my
exports.getMyCertificates = catchAsync(async (req, res) => {
  const certificates = await MemberCertificate.find({ issuedBy: req.user.id })
    .sort('-issuedDate');
  res.json({ success: true, certificates });
});

// @desc   Verify a certificate by code
// @route  GET /api/member-certificates/verify/:code
exports.verifyCertificate = catchAsync(async (req, res, next) => {
  const cert = await MemberCertificate.findOne({ verificationCode: req.params.code });
  if (!cert) {
    return next(new AppError('Invalid or expired verification code', 404));
  }
  res.json({ success: true, certificate: cert });
});