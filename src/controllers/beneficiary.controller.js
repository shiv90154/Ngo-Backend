const Beneficiary = require('../models/Beneficiary');

// ---------- CREATE ----------
exports.createBeneficiary = async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.id };
    const beneficiary = await Beneficiary.create(data);
    res.status(201).json({ success: true, beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- READ (with search, filter, pagination) ----------
exports.getBeneficiaries = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, state, district, category } = req.query;
    const filter = {};

    if (state) filter.state = state;
    if (district) filter.district = district;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const beneficiaries = await Beneficiary.find(filter)
      .populate('enrolledBy', 'fullName')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Beneficiary.countDocuments(filter);
    res.json({
      success: true,
      beneficiaries,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- UPDATE ----------
exports.updateBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user.id },
      { new: true }
    );
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    res.json({ success: true, beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- DELETE ----------
exports.deleteBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findByIdAndDelete(req.params.id);
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- EXPORT CSV ----------
exports.exportBeneficiariesCSV = async (req, res) => {
  try {
    const beneficiaries = await Beneficiary.find().lean();
    const fields = ['name', 'phone', 'email', 'state', 'district', 'block', 'village', 'category'];
    let csv = fields.join(',') + '\n';
    beneficiaries.forEach(b => {
      const row = fields.map(f => {
        let val = b[f] || '';
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
        return val;
      }).join(',');
      csv += row + '\n';
    });
    res.header('Content-Type', 'text/csv');
    res.attachment('beneficiaries.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};