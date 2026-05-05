const User = require('../models/user.model');
const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');
const MediaPost = require('../models/MediaPost');
const Appointment = require('../models/Appointment');
const Transaction = require('../models/Transaction.model');
const Loan = require('../models/Loan.model');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Notification = require('../models/Notification');

// 🆕 New imports for extended admin features
const LicenseType = require('../models/LicenseType');
const LicensePurchase = require('../models/LicensePurchase');
const CommissionSplit = require('../models/CommissionSplit');
const EducationProgram = require('../models/EducationProgram');
const Meeting = require('../models/Meeting');
const WeeklyContribution = require('../models/WeeklyContribution');

// ---------- DASHBOARD STATS ----------
exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers, activeUsers, doctors, teachers, totalPosts, totalAppointments,
      totalTransactions, activeLoans, totalCourses, totalEnrollments, recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'DOCTOR' }),
      User.countDocuments({ role: 'TEACHER' }),
      MediaPost.countDocuments(),
      Appointment.countDocuments(),
      Transaction.countDocuments(),
      Loan.countDocuments({ status: 'active' }),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      User.find().sort('-createdAt').limit(5).select('fullName email role createdAt')
    ]);
    res.json({ success: true, stats: {
      totalUsers, activeUsers, doctors, teachers, totalPosts,
      totalAppointments, totalTransactions, activeLoans, totalCourses, totalEnrollments
    }, recentUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- USER MANAGEMENT ----------

exports.createUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, role, modules, state, district, block, village, isActive } = req.body;
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, phone, and password are required' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone must be 10 digits' });
    }
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email or phone already exists' });
    }
    const user = await User.create({
      fullName, email, phone, password,
      role: role || 'USER',
      modules: modules || [],
      state, district, block, village,
      isActive: isActive !== undefined ? isActive : true,
      isVerified: true,
      createdBy: req.user.id,
    });
    const userData = user.toObject();
    delete userData.password;
    delete userData.otp;
    delete userData.otpExpire;
    res.status(201).json({ success: true, user: userData });
  } catch (error) {
    console.error('Admin create user error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, hierarchyLevel } = req.query;
    const query = { isDeleted: false };
    if (role) query.role = role;
    if (hierarchyLevel) query.hierarchyLevel = parseInt(hierarchyLevel);
    if (search) query.$or = [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    const users = await User.find(query).select('-password -otp -otpExpire')
      .populate('reportsTo', 'fullName email role')
      .sort({ hierarchyLevel: 1, createdAt: -1 })
      .limit(limit * 1).skip((page - 1) * limit);
    const total = await User.countDocuments(query);
    res.json({ success: true, users, totalPages: Math.ceil(total / limit), currentPage: page, total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otp -otpExpire')
      .populate('reportsTo', 'fullName email role')
      .populate('sponsorId', 'fullName email role');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { role, modules, isActive, reportsTo, sponsorId, hierarchyLevel } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (role) user.role = role;
    if (modules) user.modules = modules;
    if (isActive !== undefined) user.isActive = isActive;
    if (reportsTo !== undefined) user.reportsTo = reportsTo;
    if (sponsorId !== undefined) user.sponsorId = sponsorId;
    if (hierarchyLevel !== undefined) user.hierarchyLevel = hierarchyLevel;
    user.updatedBy = req.user.id;
    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.isActive = false;
    await user.save();
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- HIERARCHY ----------
exports.getHierarchy = async (req, res) => {
  try {
    const users = await User.find({ isDeleted: false }).select('fullName role hierarchyLevel reportsTo email').sort('hierarchyLevel');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSubordinates = async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;
    const subs = await User.find({ reportsTo: userId, isDeleted: false }).select('fullName email role hierarchyLevel');
    res.json({ success: true, subordinates: subs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- SETTINGS ----------
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.find();
    const result = {};
    settings.forEach(s => result[s.key] = s.value);
    res.json({ success: true, settings: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await Setting.findOneAndUpdate({ key }, { key, value, updatedAt: new Date() }, { upsert: true, new: true });
    }
    res.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- ACTIVITY LOGS ----------
exports.getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    const query = {};
    if (action) query.action = action;
    if (userId) query.user = userId;
    const logs = await ActivityLog.find(query).populate('user', 'fullName email').sort('-createdAt')
      .limit(limit * 1).skip((page - 1) * limit);
    const total = await ActivityLog.countDocuments(query);
    res.json({ success: true, logs, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- MODULE DATA ----------
exports.getModuleData = async (req, res) => {
  try {
    const { module } = req.params;
    let data;
    switch (module) {
      case 'healthcare':
        data = {
          appointments: await Appointment.countDocuments(),
          doctors: await User.countDocuments({ role: 'DOCTOR' }),
          recentAppointments: await Appointment.find().sort('-createdAt').limit(5).populate('doctorId patientId')
        };
        break;
      case 'education':
        data = {
          courses: await Course.countDocuments(),
          enrollments: await Enrollment.countDocuments(),
          recentCourses: await Course.find().sort('-createdAt').limit(5).populate('instructor')
        };
        break;
      case 'finance':
        data = {
          transactions: await Transaction.countDocuments(),
          loans: await Loan.countDocuments({ status: 'active' }),
          recentTransactions: await Transaction.find().sort('-createdAt').limit(5).populate('user')
        };
        break;
      case 'it':
        const Client = require('../models/Client');
        const Project = require('../models/Project');
        const Invoice = require('../models/Invoice');
        data = {
          clients: await Client.countDocuments(),
          projects: await Project.countDocuments(),
          invoices: await Invoice.countDocuments()
        };
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid module' });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- GLOBAL NOTIFICATIONS ----------
exports.sendGlobalNotification = async (req, res) => {
  try {
    const { title, message } = req.body;
    const users = await User.find({ isActive: true });
    const notifications = users.map(user => ({
      recipient: user._id,
      sender: req.user.id,
      type: 'global',
      metadata: { title, message },
      post: null,
      comment: null
    }));
    await Notification.insertMany(notifications);
    res.json({ success: true, message: `Sent to ${users.length} users` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- EXPORT USERS (CSV) ----------
exports.exportUsers = async (req, res) => {
  try {
    const users = await User.find({ isDeleted: false }).select('-password -otp');
    const fields = ['fullName', 'email', 'phone', 'role', 'isActive', 'createdAt'];
    let csv = fields.join(',') + '\n';
    users.forEach(user => {
      const row = fields.map(field => {
        let val = user[field];
        if (val === undefined || val === null) val = '';
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
        return val;
      }).join(',');
      csv += row + '\n';
    });
    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// 🆕 LICENSE TYPE MANAGEMENT
// ======================

// GET all license types
exports.getLicenseTypes = async (req, res) => {
  try {
    const types = await LicenseType.find().sort('membershipFee');
    res.json({ success: true, types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// CREATE a license type
exports.createLicenseType = async (req, res) => {
  try {
    const { name, code, membershipFee, incentiveAmount, description } = req.body;
    if (!name || membershipFee === undefined || incentiveAmount === undefined) {
      return res.status(400).json({ success: false, message: 'Name, membershipFee, and incentiveAmount are required' });
    }
    const duplicate = await LicenseType.findOne({ $or: [{ name }, { code }] });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'License type with that name or code already exists' });
    }
    const type = await LicenseType.create({ name, code, membershipFee, incentiveAmount, description });
    res.status(201).json({ success: true, type });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE a license type
exports.updateLicenseType = async (req, res) => {
  try {
    const { name, code, membershipFee, incentiveAmount, description } = req.body;
    const type = await LicenseType.findById(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'License type not found' });
    if (name !== undefined) type.name = name;
    if (code !== undefined) type.code = code;
    if (membershipFee !== undefined) type.membershipFee = membershipFee;
    if (incentiveAmount !== undefined) type.incentiveAmount = incentiveAmount;
    if (description !== undefined) type.description = description;
    await type.save();
    res.json({ success: true, type });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE a license type
exports.deleteLicenseType = async (req, res) => {
  try {
    const type = await LicenseType.findByIdAndDelete(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'License type not found' });
    res.json({ success: true, message: 'License type deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// 🆕 LICENSE PURCHASES (ALL)
// ======================
exports.getAllLicensePurchases = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const purchases = await LicensePurchase.find()
      .sort('-purchaseDate')
      .populate('licenseType', 'name incentiveAmount')
      .populate('soldBy', 'fullName email')
      .populate('customer', 'fullName email')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await LicensePurchase.countDocuments();
    res.json({ success: true, purchases, totalPages: Math.ceil(total / limit), currentPage: page, total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// 🆕 COMMISSION SPLITS
// ======================
exports.getCommissionSplits = async (req, res) => {
  try {
    const splits = await CommissionSplit.find().sort('levelOffset');
    res.json({ success: true, splits });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCommissionSplit = async (req, res) => {
  try {
    const { percentage } = req.body;
    if (percentage === undefined) {
      return res.status(400).json({ success: false, message: 'Percentage is required' });
    }
    const split = await CommissionSplit.findByIdAndUpdate(
      req.params.id,
      { percentage },
      { new: true }
    );
    if (!split) return res.status(404).json({ success: false, message: 'Commission split not found' });
    res.json({ success: true, split });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// 🆕 EDUCATION PROGRAMS
// ======================
exports.getEducationPrograms = async (req, res) => {
  try {
    const programs = await EducationProgram.find().sort('class');
    res.json({ success: true, programs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateEducationProgram = async (req, res) => {
  try {
    const { fee, incentive } = req.body;
    const program = await EducationProgram.findById(req.params.id);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    if (fee !== undefined) program.fee = fee;
    if (incentive !== undefined) program.incentive = incentive;
    await program.save();
    res.json({ success: true, program });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// 🆕 MEETINGS
// ======================
exports.getAllMeetings = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const meetings = await Meeting.find()
      .sort('-startTime')
      .populate('host', 'fullName email')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Meeting.countDocuments();
    res.json({ success: true, meetings, totalPages: Math.ceil(total / limit), currentPage: page, total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateMeetingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// 🆕 WEEKLY CONTRIBUTIONS
// ======================
exports.getAllContributions = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const contributions = await WeeklyContribution.find()
      .sort('-date')
      .populate('gramVikasAdhikari', 'fullName email')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await WeeklyContribution.countDocuments();
    res.json({ success: true, contributions, totalPages: Math.ceil(total / limit), currentPage: page, total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};