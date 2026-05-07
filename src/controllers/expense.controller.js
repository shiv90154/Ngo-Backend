const Expense = require('../models/Expense');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ---------- CREATE ----------
exports.createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- READ (with filters) ----------
exports.getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (startDate) filter.date = { $gte: new Date(startDate) };
    if (endDate) filter.date = { ...filter.date, $lte: new Date(endDate) };
    if (search) filter.title = { $regex: search, $options: 'i' };

    const expenses = await Expense.find(filter)
      .populate('createdBy', 'fullName')
      .sort('-date')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Expense.countDocuments(filter);
    res.json({ success: true, expenses, totalPages: Math.ceil(total / limit), currentPage: Number(page), total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- UPDATE ----------
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- DELETE ----------
exports.deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- EXPORT PDF REPORT ----------
exports.exportExpensesPDF = async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (startDate) filter.date = { $gte: new Date(startDate) };
    if (endDate) filter.date = { ...filter.date, $lte: new Date(endDate) };

    const expenses = await Expense.find(filter).sort('-date').lean();
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.join(__dirname, '..', 'uploads', 'reports', `expense_report_${Date.now()}.pdf`);
    
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('Samraddh Bharat Foundation', { align: 'center' });
    doc.fontSize(14).text('Expense Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, { align: 'right' });
    doc.moveDown();

    // Table header
    let y = doc.y;
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Date', 50, y);
    doc.text('Title', 150, y);
    doc.text('Category', 300, y);
    doc.text('Amount', 420, y);
    doc.moveDown();

    doc.font('Helvetica').fontSize(10);
    expenses.forEach((exp, idx) => {
      if (doc.y > 700) { doc.addPage(); }
      y = doc.y;
      doc.text(new Date(exp.date).toLocaleDateString('en-IN'), 50, y);
      doc.text(exp.title, 150, y, { width: 130 });
      doc.text(exp.category, 300, y);
      doc.text(`₹${exp.amount.toLocaleString('en-IN')}`, 420, y);
      doc.moveDown();
    });

    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`Total Expenses: ₹${totalAmount.toLocaleString('en-IN')}`, { align: 'right' });

    doc.end();
    await new Promise(r => stream.on('finish', r));

    res.download(filePath, `expense_report_${new Date().toISOString().slice(0,10)}.pdf`);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};