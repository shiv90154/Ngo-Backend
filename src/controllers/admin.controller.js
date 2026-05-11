// backend/src/controllers/admin.controller.js
const asyncHandler = require('express-async-handler');
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

const LicenseType = require('../models/LicenseType');
const LicensePurchase = require('../models/LicensePurchase');
const CommissionSplit = require('../models/CommissionSplit');
const EducationProgram = require('../models/EducationProgram');
const Meeting = require('../models/Meeting');
const WeeklyContribution = require('../models/WeeklyContribution');
const ProductSale = require('../models/ProductSale');

// ---------- DASHBOARD STATS ----------
exports.getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers, activeUsers, doctors, teachers, totalPosts, totalAppointments,
    totalTransactions, activeLoans, totalCourses, totalEnrollments,
    totalLicenses, totalProductSales, recentUsers
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'BAMS_DOCTOR' }),
    User.countDocuments({ role: 'TEACHER' }),
    MediaPost.countDocuments(),
    Appointment.countDocuments(),
    Transaction.countDocuments(),
    Loan.countDocuments({ status: 'active' }),
    Course.countDocuments(),
    Enrollment.countDocuments(),
    LicenseType.countDocuments({ isActive: true }),
    ProductSale.countDocuments(),
    User.find().sort('-createdAt').limit(5).select('fullName email role createdAt')
  ]);
  res.json({
    success: true,
    stats: {
      totalUsers, activeUsers, doctors, teachers, totalPosts,
      totalAppointments, totalTransactions, activeLoans, totalCourses, totalEnrollments,
      totalLicenses, totalProductSales
    },
    recentUsers
  });
});

// ---------- USER MANAGEMENT ----------
exports.createUser = asyncHandler(async (req, res) => {
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
});

exports.getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, search, hierarchyLevel } = req.query;
  const query = { isDeleted: false };
  if (role) query.role = role;
  if (hierarchyLevel) query.hierarchyLevel = parseInt(hierarchyLevel);
  if (search) query.$or = [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  const users = await User.find(query)
    .select('-password -otp -otpExpire')
    .populate('reportsTo', 'fullName email role')
    .populate('sponsorId', 'fullName email role')
    .sort({ hierarchyLevel: 1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  const total = await User.countDocuments(query);
  res.json({
    success: true,
    users,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    total
  });
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -otp -otpExpire')
    .populate('reportsTo', 'fullName email role')
    .populate('sponsorId', 'fullName email role');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const allowedFields = ['role', 'modules', 'isActive', 'reportsTo', 'sponsorId', 'hierarchyLevel', 'incentivePayoutInfo'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });
  user.updatedBy = req.user.id;
  await user.save();
  res.json({ success: true, user });
});

exports.toggleActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, isActive: user.isActive });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isDeleted = true;
  user.deletedAt = new Date();
  user.isActive = false;
  await user.save();
  res.json({ success: true, message: 'User deactivated' });
});

// ---------- HIERARCHY ----------
exports.getHierarchy = asyncHandler(async (req, res) => {
  const users = await User.find({ isDeleted: false })
    .select('fullName role hierarchyLevel reportsTo email sponsorId')
    .sort('hierarchyLevel');
  res.json({ success: true, users });
});

exports.getSubordinates = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.user.id;
  const subs = await User.find({ reportsTo: userId, isDeleted: false })
    .select('fullName email role hierarchyLevel');
  res.json({ success: true, subordinates: subs });
});

// ---------- SETTINGS ----------
exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.find();
  const result = {};
  settings.forEach(s => result[s.key] = s.value);
  res.json({ success: true, settings: result });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const updates = req.body;
  for (const [key, value] of Object.entries(updates)) {
    await Setting.findOneAndUpdate(
      { key },
      { key, value, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }
  res.json({ success: true, message: 'Settings saved' });
});

// ---------- ACTIVITY LOGS ----------
exports.getLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, userId } = req.query;
  const query = {};
  if (action) query.action = action;
  if (userId) query.user = userId;
  const logs = await ActivityLog.find(query)
    .populate('user', 'fullName email')
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);
  const total = await ActivityLog.countDocuments(query);
  res.json({
    success: true,
    logs,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page)
  });
});

// ---------- MODULE DATA ----------
exports.getModuleData = asyncHandler(async (req, res) => {
  const { module } = req.params;
  let data;
  switch (module) {
    case 'healthcare':
      data = {
        appointments: await Appointment.countDocuments(),
        doctors: await User.countDocuments({ role: 'BAMS_DOCTOR' }),
        recentAppointments: await Appointment.find().sort('-createdAt').limit(5)
          .populate('doctorId patientId')
      };
      break;
    case 'education':
      data = {
        courses: await Course.countDocuments(),
        enrollments: await Enrollment.countDocuments(),
        recentCourses: await Course.find().sort('-createdAt').limit(5)
          .populate('instructor')
      };
      break;
    case 'finance':
      data = {
        transactions: await Transaction.countDocuments(),
        activeLoans: await Loan.countDocuments({ status: 'active' }),
        recentTransactions: await Transaction.find().sort('-createdAt').limit(5)
          .populate('user')
      };
      break;
    case 'it':
      try {
        const Client = require('../models/Client');
        const Project = require('../models/Project');
        const Invoice = require('../models/Invoice');
        data = {
          clients: await Client.countDocuments(),
          projects: await Project.countDocuments(),
          invoices: await Invoice.countDocuments()
        };
      } catch (e) {
        data = { message: 'IT models not found' };
      }
      break;
    default:
      return res.status(400).json({ success: false, message: 'Invalid module' });
  }
  res.json({ success: true, data });
});

// ---------- GLOBAL NOTIFICATIONS ----------
exports.sendGlobalNotification = asyncHandler(async (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ success: false, message: 'Title and message are required' });
  }
  const users = await User.find({ isActive: true });
  await Notification.insertMany(
    users.map(user => ({
      recipient: user._id,
      sender: req.user.id,
      type: 'global',
      metadata: { title, message }
    }))
  );
  res.json({ success: true, message: `Sent to ${users.length} users` });
});

// ---------- EXPORT USERS (CSV) ----------
exports.exportUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isDeleted: false }).select('-password -otp -otpExpire');
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
});

// ======================
// LICENSE TYPE MANAGEMENT
// ======================
exports.getLicenseTypes = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;
  const types = await LicenseType.find(filter).sort('membershipFee');
  res.json({ success: true, types });
});

exports.createLicenseType = asyncHandler(async (req, res) => {
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
});

exports.updateLicenseType = asyncHandler(async (req, res) => {
  const type = await LicenseType.findById(req.params.id);
  if (!type) return res.status(404).json({ success: false, message: 'License type not found' });
  const allowedFields = ['name', 'code', 'membershipFee', 'incentiveAmount', 'description'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) type[field] = req.body[field];
  });
  await type.save();
  res.json({ success: true, type });
});

exports.deleteLicenseType = asyncHandler(async (req, res) => {
  const type = await LicenseType.findByIdAndDelete(req.params.id);
  if (!type) return res.status(404).json({ success: false, message: 'License type not found' });
  res.json({ success: true, message: 'License type deleted' });
});

// ======================
// LICENSE PURCHASES
// ======================
exports.getAllLicensePurchases = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const purchases = await LicensePurchase.find()
    .sort('-purchaseDate')
    .populate('licenseType', 'name incentiveAmount')
    .populate('soldBy', 'fullName email')
    .populate('customer', 'fullName email')
    .limit(limit * 1)
    .skip((page - 1) * limit);
  const total = await LicensePurchase.countDocuments();
  res.json({ success: true, purchases, totalPages: Math.ceil(total / limit), currentPage: parseInt(page), total });
});

// ======================
// COMMISSION SPLITS
// ======================
exports.getCommissionSplits = asyncHandler(async (req, res) => {
  const splits = await CommissionSplit.find().sort('levelOffset');
  res.json({ success: true, splits });
});

exports.updateCommissionSplit = asyncHandler(async (req, res) => {
  const { percentage } = req.body;
  if (percentage === undefined) {
    return res.status(400).json({ success: false, message: 'Percentage is required' });
  }
  const split = await CommissionSplit.findByIdAndUpdate(req.params.id, { percentage }, { new: true });
  if (!split) return res.status(404).json({ success: false, message: 'Commission split not found' });
  res.json({ success: true, split });
});

// ======================
// EDUCATION PROGRAMS
// ======================
exports.getEducationPrograms = asyncHandler(async (req, res) => {
  const programs = await EducationProgram.find().sort('class');
  res.json({ success: true, programs });
});

exports.updateEducationProgram = asyncHandler(async (req, res) => {
  const { fee, incentive } = req.body;
  const program = await EducationProgram.findById(req.params.id);
  if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
  if (fee !== undefined) program.fee = fee;
  if (incentive !== undefined) program.incentive = incentive;
  await program.save();
  res.json({ success: true, program });
});

// ======================
// ALL PRODUCT SALES (Admin view)
// ======================
exports.getAllProductSales = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const sales = await ProductSale.find()
    .sort('-purchaseDate')
    .populate('licenseType', 'name')
    .populate('educationProgram', 'title')
    .populate('soldBy', 'fullName email role')
    .populate('customer', 'fullName email')
    .limit(limit * 1)
    .skip((page - 1) * limit);
  const total = await ProductSale.countDocuments();
  res.json({
    success: true,
    sales,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    total
  });
});

// ======================
// MEETINGS
// ======================
exports.getAllMeetings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const meetings = await Meeting.find()
    .sort('-startTime')
    .populate('host', 'fullName email')
    .limit(limit * 1)
    .skip((page - 1) * limit);
  const total = await Meeting.countDocuments();
  res.json({ success: true, meetings, totalPages: Math.ceil(total / limit), currentPage: parseInt(page), total });
});

exports.updateMeetingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
  const meeting = await Meeting.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
  res.json({ success: true, meeting });
});

// ======================
// WEEKLY CONTRIBUTIONS
// ======================
exports.getAllContributions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const contributions = await WeeklyContribution.find()
    .sort('-date')
    .populate('gramVikasAdhikari', 'fullName email')
    .limit(limit * 1)
    .skip((page - 1) * limit);
  const total = await WeeklyContribution.countDocuments();
  res.json({ success: true, contributions, totalPages: Math.ceil(total / limit), currentPage: parseInt(page), total });
});