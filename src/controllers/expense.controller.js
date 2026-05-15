const Expense = require('../models/Expense');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// @desc   Get all expenses (scoped)
// @route  GET /api/expenses
exports.getExpenses = catchAsync(async (req, res) => {
  const filter = { ...req.scopeFilter };
  const expenses = await Expense.find(filter).sort('-date').populate('createdBy', 'fullName');
  const total = await Expense.countDocuments(filter);
  res.json({ success: true, expenses, total });
});

// @desc   Create a new expense
// @route  POST /api/expenses
exports.createExpense = catchAsync(async (req, res, next) => {
  const { category, amount, description, date } = req.body;

  if (!category || !amount) {
    return next(new AppError('श्रेणी और राशि आवश्यक है', 400));
  }

  const expense = await Expense.create({
    category,
    amount,
    description,
    date: date || new Date(),
    state: req.user.state,
    district: req.user.district,
    block: req.user.block,
    village: req.user.village,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, expense });
});

// @desc   Update an expense
// @route  PUT /api/expenses/:id
exports.updateExpense = catchAsync(async (req, res, next) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return next(new AppError('Expense not found', 404));

  // Only creator or SUPER_ADMIN can update
  if (req.user.role !== 'SUPER_ADMIN' && expense.createdBy.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this expense', 403));
  }

  const allowedFields = ['category', 'amount', 'description', 'date'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) expense[field] = req.body[field];
  });

  await expense.save();
  res.json({ success: true, expense });
});

// @desc   Delete an expense
// @route  DELETE /api/expenses/:id
exports.deleteExpense = catchAsync(async (req, res, next) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return next(new AppError('Expense not found', 404));

  if (req.user.role !== 'SUPER_ADMIN' && expense.createdBy.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to delete this expense', 403));
  }

  await expense.deleteOne();
  res.json({ success: true, message: 'Expense deleted' });
});

// @desc   PDF export (placeholder)
// @route  GET /api/expenses/export/pdf
exports.exportExpensesPDF = catchAsync(async (req, res) => {
  // PDF generation logic will be added later
  res.json({ success: true, message: 'PDF export placeholder' });
});