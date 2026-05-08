const MemberCertificate = require('../models/MemberCertificate'); // fields: memberName, certificateType, issuedDate, verificationCode

exports.generateCertificate = async (req, res) => {
  try {
    const { memberName, certificateType, customMessage } = req.body;
    const verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const certificate = await MemberCertificate.create({
      memberName,
      certificateType,
      customMessage,
      verificationCode,
      issuedBy: req.user.id,
    });
    res.status(201).json({ success: true, certificate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllCertificates = async (req, res) => {
  try {
    const certificates = await MemberCertificate.find().sort({ issuedDate: -1 }).populate('issuedBy', 'fullName');
    res.json({ success: true, certificates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMyCertificates = async (req, res) => {
  try {
    const certificates = await MemberCertificate.find({ issuedBy: req.user.id }).sort({ issuedDate: -1 });
    res.json({ success: true, certificates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.verifyCertificate = async (req, res) => {
  try {
    const cert = await MemberCertificate.findOne({ verificationCode: req.params.code });
    if (!cert) return res.status(404).json({ success: false, message: 'Invalid certificate' });
    res.json({ success: true, certificate: cert });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};