const Contract = require('../models/Contract');
const User = require('../models/user.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer setup for receipt uploads
const uploadDir = path.join(__dirname, '../uploads/contract-receipts');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ---------- USER: Get own contract ----------
exports.getMyContract = async (req, res) => {
  try {
    let contract = await Contract.findOne({ user: req.user.id }).populate('user', 'fullName role');
    if (!contract) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const feeMap = {
        STATE_OFFICER: 10000,
        DISTRICT_MANAGER: 5000,
        DEFAULT: 0,
      };
      const depositMap = {
        STATE_OFFICER: 50000,
        DISTRICT_MANAGER: 20000,
        DEFAULT: 0,
      };

      contract = await Contract.create({
        user: req.user.id,
        role: user.role,
        fullName: user.fullName,
        fatherName: user.fatherName || '',
        dob: user.dob,
        address: user.fullAddress || '',
        phone: user.phone,
        email: user.email,
        aadhaarNumber: user.aadhaarNumber || '',
        panNumber: user.panNumber || '',
        qualification: user.teacherProfile?.qualifications?.join(', ') || '',
        state: user.state || '',
        district: user.district || '',
        block: user.block || '',
        gramPanchayat: user.village || '',
        processingFee: { amount: feeMap[user.role] || feeMap.DEFAULT },
        securityDeposit: { amount: depositMap[user.role] || depositMap.DEFAULT },
        createdBy: req.user.id,
      });
    }
    res.json({ success: true, contract });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- USER: Update contract (step‑by‑step) ----------
exports.updateMyContract = async (req, res) => {
  try {
    let contract = await Contract.findOne({ user: req.user.id });
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const simpleFields = [
      'fullName','fatherName','dob','address','phone','email',
      'aadhaarNumber','panNumber','qualification','currentWork',
      'state','district','block','gramPanchayat'
    ];
    simpleFields.forEach(f => {
      if (req.body[f] !== undefined) contract[f] = req.body[f];
    });

    if (req.files) {
      const moveFile = (fieldName, targetField) => {
        if (req.files[fieldName]) {
          const file = req.files[fieldName][0];
          contract[targetField] = `/uploads/contract-receipts/${file.filename}`;
        }
      };
      moveFile('processingFeeReceipt', 'processingFee.receiptUrl');
      moveFile('donationReceipt', 'donation.receiptUrl');
      moveFile('securityDepositReceipt', 'securityDeposit.receiptUrl');
      if (req.files.signature) {
        const sigFile = req.files.signature[0];
        contract.signature = `/uploads/contract-receipts/${sigFile.filename}`;
        contract.signedAt = new Date();
      }
    }

    if (req.body.processingFee) {
      const pf = JSON.parse(req.body.processingFee);
      contract.processingFee = { ...contract.processingFee, ...pf };
    }
    if (req.body.donation) {
      const don = JSON.parse(req.body.donation);
      contract.donation = { ...contract.donation, ...don };
    }
    if (req.body.securityDeposit) {
      const sd = JSON.parse(req.body.securityDeposit);
      contract.securityDeposit = { ...contract.securityDeposit, ...sd };
    }

    if (req.body.termsAccepted === 'true') {
      contract.termsAccepted = true;
      contract.termsAcceptedAt = new Date();
    }

    if (req.body.signatureBase64) {
      contract.signature = req.body.signatureBase64;
      contract.signedAt = new Date();
    }

    const pf = contract.processingFee;
    const sd = contract.securityDeposit;
    if (pf.paid && sd.paid && contract.termsAccepted && contract.signature) {
      contract.status = 'completed';
    } else {
      contract.status = 'draft';
    }

    contract.updatedBy = req.user.id;
    await contract.save();
    res.json({ success: true, contract });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- ADMIN: List all contracts ----------
exports.getAllContracts = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, adminStatus } = req.query;
    const query = {};
    if (role) query.role = role;
    if (adminStatus) query.adminStatus = adminStatus;

    const contracts = await Contract.find(query)
      .populate('user', 'fullName email role')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Contract.countDocuments(query);
    res.json({ success: true, contracts, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- ADMIN: Review a contract (approve/reject) ----------
exports.reviewContract = async (req, res) => {
  try {
    const { adminStatus, adminNotes } = req.body;
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    contract.adminStatus = adminStatus || contract.adminStatus;
    if (adminNotes) contract.adminNotes = adminNotes;
    contract.reviewedBy = req.user.id;
    contract.reviewedAt = new Date();

    // 🆕 Sync user's contractStatus for instant dashboard access
    const user = await User.findById(contract.user);
    if (user) {
      if (adminStatus === 'approved') {
        contract.status = 'completed';
        user.contractStatus = 'completed';
      } else if (adminStatus === 'rejected') {
        contract.status = 'rejected';
        user.contractStatus = 'rejected';
      }
      await user.save();
    }

    await contract.save();
    res.json({ success: true, contract });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Export multer middleware for routes
exports.uploadReceipt = upload.fields([
  { name: 'processingFeeReceipt', maxCount: 1 },
  { name: 'donationReceipt', maxCount: 1 },
  { name: 'securityDepositReceipt', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
]);