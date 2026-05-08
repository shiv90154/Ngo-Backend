const Expense = require('../models/Expense'); // fields: category, amount, description, date, state

exports.getExpenses = async (req, res) => {
  try {
    const filter = { ...req.scopeFilter };
    const expenses = await Expense.find(filter).sort({ date: -1 });
    const total = await Expense.countDocuments(filter);
    res.json({ success: true, expenses, total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.exportExpensesPDF = async (req, res) => {
  // PDF generation logic
  res.json({ success: true, message: 'PDF export placeholder' });
};