const Beneficiary = require('../models/Beneficiary'); // fields: name, state, district, block, village, phone, gender, age, category

exports.getBeneficiaries = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = { ...req.scopeFilter };
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
    res.json({ success: true, beneficiaries, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    res.json({ success: true, beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findByIdAndDelete(req.params.id);
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    res.json({ success: true, message: 'Beneficiary deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.exportBeneficiariesCSV = async (req, res) => {
  // Simple CSV export (you can use a library)
  try {
    const data = await Beneficiary.find(req.scopeFilter).lean();
    const csv = 'Name,State,District,Phone\n' + data.map(b => `${b.name},${b.state},${b.district},${b.phone}`).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('beneficiaries.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};