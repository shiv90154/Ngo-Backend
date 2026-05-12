const MemberCertificate = require('../models/MemberCertificate');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// @desc   Generate a new certificate
// @route  POST /api/member-certificates/generate
exports.generateCertificate = catchAsync(async (req, res, next) => {
  const { memberName, certificateType, customMessage } = req.body;

  if (!memberName || !certificateType) {
    return next(new AppError('सदस्य का नाम और प्रमाणपत्र प्रकार आवश्यक है', 400));
  }

  // Generate a unique verification code
  const verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const certificate = await MemberCertificate.create({
    memberName,
    certificateType,
    customMessage,
    verificationCode,
    issuedBy: req.user.id,
    state: req.user.state,
    district: req.user.district,
    block: req.user.block,
    village: req.user.village,
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