const Beneficiary = require('../models/Beneficiary');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// @desc   Get all beneficiaries (filtered by scope)
// @route  GET /api/beneficiaries
exports.getBeneficiaries = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const filter = { ...req.scopeFilter };   // middleware: scopeFilter sets this

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { district: { $regex: search, $options: 'i' } },
    ];
  }

  const beneficiaries = await Beneficiary.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Beneficiary.countDocuments(filter);

  res.json({
    success: true,
    beneficiaries,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit)
  });
});

// @desc   Create a new beneficiary
// @route  POST /api/beneficiaries
exports.createBeneficiary = catchAsync(async (req, res) => {
  const beneficiary = await Beneficiary.create({
    ...req.body,
    createdBy: req.user.id
  });
  res.status(201).json({ success: true, beneficiary });
});

// @desc   Update a beneficiary
// @route  PUT /api/beneficiaries/:id
exports.updateBeneficiary = catchAsync(async (req, res, next) => {
  const beneficiary = await Beneficiary.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!beneficiary) {
    return next(new AppError('Beneficiary not found', 404));
  }
  res.json({ success: true, beneficiary });
});

// @desc   Delete a beneficiary
// @route  DELETE /api/beneficiaries/:id
exports.deleteBeneficiary = catchAsync(async (req, res, next) => {
  const beneficiary = await Beneficiary.findByIdAndDelete(req.params.id);
  if (!beneficiary) {
    return next(new AppError('Beneficiary not found', 404));
  }
  res.json({ success: true, message: 'Beneficiary deleted' });
});

// @desc   Export beneficiaries as CSV
// @route  GET /api/beneficiaries/export/csv
exports.exportBeneficiariesCSV = catchAsync(async (req, res) => {
  const data = await Beneficiary.find(req.scopeFilter).lean();
  const csv = 'Name,State,District,Phone\n' +
    data.map(b => `${b.name},${b.state},${b.district},${b.phone}`).join('\n');

  res.header('Content-Type', 'text/csv');
  res.attachment('beneficiaries.csv');
  res.send(csv);
});