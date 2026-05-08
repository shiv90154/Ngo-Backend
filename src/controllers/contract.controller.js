const Contract = require('../models/Contract');
const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ADMIN: Create or Update contract for a role
exports.createOrUpdateContract = catchAsync(async (req, res, next) => {
  const { role, title, content, terms, requiredFields } = req.body;
  if (!role || !title || !content) throw new AppError('भूमिका, शीर्षक और सामग्री आवश्यक हैं', 400);

  // Upsert – अगर पहले से है तो अपडेट करो, नहीं तो बनाओ
  const contract = await Contract.findOneAndUpdate(
    { role },
    { title, content, terms, requiredFields, updatedBy: req.user.id },
    { new: true, upsert: true, runValidators: true }
  );
  res.status(200).json({ success: true, contract });
});

// ADMIN: Get all contracts
exports.getAllContracts = catchAsync(async (req, res, next) => {
  const contracts = await Contract.find().sort({ role: 1 });
  res.json({ success: true, contracts });
});

// USER: Get own contract (based on role)
exports.getMyContract = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('यूज़र नहीं मिला', 404);

  const contract = await Contract.findOne({ role: user.role, isActive: true });
  if (!contract) {
    // अगर कोई कॉन्ट्रैक्ट नहीं है तो खाली भेजो
    return res.json({ success: true, contract: null, message: 'इस भूमिका के लिए कोई अनुबंध नहीं है' });
  }

  // Check user's current contract status
  const userContractData = {
    contract,
    userStatus: {
      contractStatus: user.contractStatus,
      contractCompletedAt: user.contractCompletedAt,
      processingFee: user.processingFee,
      securityDeposit: user.securityDeposit,
    },
  };

  res.json({ success: true, data: userContractData });
});

// USER: Sign / Complete contract
exports.updateMyContract = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('यूज़र नहीं मिला', 404);

  // If contract already completed, prevent duplicate
  if (user.contractStatus === 'completed') {
    throw new AppError('अनुबंध पहले ही पूरा हो चुका है', 400);
  }

  // Update user's contract-related fields
  const { processingFee, securityDeposit, signature, agreement } = req.body;

  // Handle file upload (signature)
  if (req.file) {
    user.signature = `/uploads/signatures/${req.file.filename}`;
  }

  if (processingFee) user.processingFee = processingFee;
  if (securityDeposit) user.securityDeposit = securityDeposit;
  
  // Mark contract as completed
  user.contractStatus = 'completed';
  user.contractCompletedAt = new Date();
  user.updatedBy = req.user.id;

  await user.save();

  const contract = await Contract.findOne({ role: user.role });
  
  res.json({
    success: true,
    message: 'अनुबंध सफलतापूर्वक पूरा हुआ',
    user: {
      contractStatus: user.contractStatus,
      contractCompletedAt: user.contractCompletedAt,
      processingFee: user.processingFee,
      securityDeposit: user.securityDeposit,
    },
  });
});

// ADMIN: Review / Approve contract
exports.reviewContract = catchAsync(async (req, res, next) => {
  const { userId, status, remarks } = req.body;
  const user = await User.findById(userId);
  if (!user) throw new AppError('यूज़र नहीं मिला', 404);

  if (status === 'approved') {
    user.contractStatus = 'completed';
    user.contractCompletedAt = new Date();
  } else if (status === 'rejected') {
    user.contractStatus = 'draft'; // reset to draft
    user.contractRejectionReason = remarks;
  }

  user.contractReviewedBy = req.user.id;
  user.contractReviewedAt = new Date();
  await user.save();

  res.json({ success: true, message: `अनुबंध ${status === 'approved' ? 'स्वीकृत' : 'अस्वीकृत'} हुआ` });
});