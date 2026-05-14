// backend/src/controllers/admin.controller.js
const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Models that are essential
const LicenseType = require('../models/LicenseType');
const LicensePurchase = require('../models/LicensePurchase');
const CommissionSplit = require('../models/CommissionSplit');
const EducationProgram = require('../models/EducationProgram');
const ProductSale = require('../models/ProductSale');

// Additional models (now created as skeletons)
const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');
const MediaPost = require('../models/MediaPost');
const Appointment = require('../models/Appointment');
const Transaction = require('../models/Transaction.model');
const Loan = require('../models/Loan.model');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Notification = require('../models/Notification');
const Meeting = require('../models/Meeting');
const WeeklyContribution = require('../models/WeeklyContribution');
// Optional IT models
let Client, Project, Invoice;
try {
  Client = require('../models/Client');
  Project = require('../models/Project');
  Invoice = require('../models/Invoice');
} catch (e) {
  // ignore if not created yet
}

// ---------- DASHBOARD STATS ----------
exports.getStats = catchAsync(async (req, res) => {
  const [
    totalUsers, activeUsers, doctors, teachers, totalPosts, totalAppointments,
    totalTransactions, activeLoans, totalCourses, totalEnrollments,
    totalLicenses, totalProductSales, recentUsers
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'BAMS_DOCTOR' }),
    User.countDocuments({ role: 'TEACHER' }),
    MediaPost.countDocuments().catch(() => 0),
    Appointment.countDocuments().catch(() => 0),
    Transaction.countDocuments().catch(() => 0),
    Loan.countDocuments({ status: 'active' }).catch(() => 0),
    Course.countDocuments().catch(() => 0),
    Enrollment.countDocuments().catch(() => 0),
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
exports.createUser = catchAsync(async (req, res, next) => {
  const { fullName, email, phone, password, role, modules, state, district, block, village, isActive, sponsorReferral } = req.body;
  if (!fullName || !email || !phone || !password) {
    return next(new AppError('Full name, email, phone, and password are required', 400));
  }
  if (!/^\d{10}$/.test(phone)) {
    return next(new AppError('Phone must be 10 digits', 400));
  }
  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) {
    return next(new AppError('User with this email or phone already exists', 400));
  }

  // 🆕 Resolve sponsor from referral code (if provided)
  let sponsorId = null;
  if (sponsorReferral) {
    const sponsor = await User.findOne({ referralCode: sponsorReferral });
    if (sponsor) {
      sponsorId = sponsor._id;
    } else {
      return next(new AppError('Invalid sponsor referral code', 400));
    }
  }

  const user = await User.create({
    fullName, email, phone, password,
    role: role || 'USER',
    modules: modules || [],
    state, district, block, village,
    isActive: isActive !== undefined ? isActive : true,
    isVerified: true,
    createdBy: req.user.id,
    sponsorId,
    sponsorReferral,
  });

  if (sponsorId) {
    const sponsor = await User.findById(sponsorId);
    if (sponsor) {
      sponsor.teamSize = (sponsor.teamSize || 0) + 1;
      if (!sponsor.leftChild) {
        sponsor.leftChild = user._id;
      } else if (!sponsor.rightChild) {
        sponsor.rightChild = user._id;
      }
      await sponsor.save();
    }
  }

  const userData = user.toObject();
  delete userData.password;
  delete userData.otp;
  delete userData.otpExpire;
  res.status(201).json({ success: true, user: userData });
});

exports.getUsers = catchAsync(async (req, res) => {
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

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password -otp -otpExpire')
    .populate('reportsTo', 'fullName email role')
    .populate('sponsorId', 'fullName email role');
  if (!user) return next(new AppError('User not found', 404));
  res.json({ success: true, user });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));
  const allowedFields = ['role', 'modules', 'isActive', 'reportsTo', 'sponsorId', 'hierarchyLevel', 'incentivePayoutInfo', 'password'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });
  user.updatedBy = req.user.id;
  await user.save();
  res.json({ success: true, user });
});

exports.toggleActive = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, isActive: user.isActive });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));
  user.isDeleted = true;
  user.deletedAt = new Date();
  user.isActive = false;
  await user.save();
  res.json({ success: true, message: 'User deactivated' });
});

// ---------- HIERARCHY ----------
exports.getHierarchy = catchAsync(async (req, res) => {
  const users = await User.find({ isDeleted: false })
    .select('fullName role hierarchyLevel reportsTo email sponsorId')
    .sort('hierarchyLevel');
  res.json({ success: true, users });
});

exports.getSubordinates = catchAsync(async (req, res, next) => {
  const userId = req.params.id || req.user.id;
  const subs = await User.find({ reportsTo: userId, isDeleted: false })
    .select('fullName email role hierarchyLevel');
  res.json({ success: true, subordinates: subs });
});

// ---------- SETTINGS ----------
exports.getSettings = catchAsync(async (req, res) => {
  const settings = await Setting.find();
  const result = {};
  settings.forEach(s => result[s.key] = s.value);
  res.json({ success: true, settings: result });
});

exports.updateSettings = catchAsync(async (req, res) => {
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
exports.getLogs = catchAsync(async (req, res) => {
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

// ---------- MODULE DATA (safe) ----------
exports.getModuleData = catchAsync(async (req, res, next) => {
  const { module } = req.params;
  let data;
  switch (module) {
    case 'healthcare':
      data = {
        appointments: await Appointment.countDocuments().catch(() => 0),
        doctors: await User.countDocuments({ role: 'BAMS_DOCTOR' }),
        recentAppointments: await Appointment.find().sort('-createdAt').limit(5)
          .populate('doctorId patientId').catch(() => [])
      };
      break;
    case 'education':
      data = {
        courses: await Course.countDocuments().catch(() => 0),
        enrollments: await Enrollment.countDocuments().catch(() => 0),
        recentCourses: await Course.find().sort('-createdAt').limit(5)
          .populate('instructor').catch(() => [])
      };
      break;
    case 'finance':
      data = {
        transactions: await Transaction.countDocuments().catch(() => 0),
        activeLoans: await Loan.countDocuments({ status: 'active' }).catch(() => 0),
        recentTransactions: await Transaction.find().sort('-createdAt').limit(5)
          .populate('user').catch(() => [])
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
      return next(new AppError('Invalid module', 400));
  }
  res.json({ success: true, data });
});

// ---------- GLOBAL NOTIFICATIONS ----------
exports.sendGlobalNotification = catchAsync(async (req, res, next) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return next(new AppError('Title and message are required', 400));
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
exports.exportUsers = catchAsync(async (req, res) => {
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
exports.getLicenseTypes = catchAsync(async (req, res) => {
  const types = await LicenseType.find({ isActive: true }).sort('membershipFee');
  res.json({ success: true, types });
});

exports.createLicenseType = catchAsync(async (req, res, next) => {
  const { name, code, membershipFee, incentiveAmount, description } = req.body;
  if (!name || membershipFee === undefined || incentiveAmount === undefined) {
    return next(new AppError('Name, membershipFee, and incentiveAmount are required', 400));
  }
  const duplicate = await LicenseType.findOne({ $or: [{ name }, { code }] });
  if (duplicate) {
    return next(new AppError('License type with that name or code already exists', 400));
  }
  const type = await LicenseType.create({ name, code, membershipFee, incentiveAmount, description });
  res.status(201).json({ success: true, type });
});

exports.updateLicenseType = catchAsync(async (req, res, next) => {
  const type = await LicenseType.findById(req.params.id);
  if (!type) return next(new AppError('License type not found', 404));
  const allowedFields = ['name', 'code', 'membershipFee', 'incentiveAmount', 'description'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) type[field] = req.body[field];
  });
  await type.save();
  res.json({ success: true, type });
});

exports.deleteLicenseType = catchAsync(async (req, res, next) => {
  const type = await LicenseType.findByIdAndDelete(req.params.id);
  if (!type) return next(new AppError('License type not found', 404));
  res.json({ success: true, message: 'License type deleted' });
});

// ======================
// LICENSE PURCHASES
// ======================
exports.getAllLicensePurchases = catchAsync(async (req, res) => {
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
exports.getCommissionSplits = catchAsync(async (req, res) => {
  const splits = await CommissionSplit.find().sort('levelOffset');
  res.json({ success: true, splits });
});

exports.updateCommissionSplit = catchAsync(async (req, res, next) => {
  const { percentage, productType } = req.body;
  const updateData = {};
  if (percentage !== undefined) updateData.percentage = percentage;
  if (productType !== undefined) updateData.productType = productType;
  
  if (Object.keys(updateData).length === 0) {
    return next(new AppError('No fields to update', 400));
  }
  
  const split = await CommissionSplit.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!split) return next(new AppError('Commission split not found', 404));
  res.json({ success: true, split });
});

exports.createCommissionSplit = catchAsync(async (req, res, next) => {
  const { roleName, percentage, levelOffset, productType } = req.body;
  if (!roleName || percentage === undefined || levelOffset === undefined) {
    return next(new AppError('Role name, percentage, and level offset are required', 400));
  }
  const split = await CommissionSplit.create({
    roleName,
    percentage,
    levelOffset,
    productType: productType || 'all',
  });
  res.status(201).json({ success: true, split });
});

exports.deleteCommissionSplit = catchAsync(async (req, res, next) => {
  const split = await CommissionSplit.findByIdAndDelete(req.params.id);
  if (!split) return next(new AppError('Split not found', 404));
  res.json({ success: true, message: 'Split deleted' });
});

// ======================
// EDUCATION PROGRAMS
// ======================
exports.getEducationPrograms = catchAsync(async (req, res) => {
  const programs = await EducationProgram.find().sort('class');
  res.json({ success: true, programs });
});

exports.updateEducationProgram = catchAsync(async (req, res, next) => {
  const { fee, incentive } = req.body;
  const program = await EducationProgram.findById(req.params.id);
  if (!program) return next(new AppError('Program not found', 404));
  if (fee !== undefined) program.fee = fee;
  if (incentive !== undefined) program.incentive = incentive;
  await program.save();
  res.json({ success: true, program });
});

// ======================
// ALL PRODUCT SALES (Admin view)
// ======================
exports.getAllProductSales = catchAsync(async (req, res) => {
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
  res.json({ success: true, sales, totalPages: Math.ceil(total / limit), currentPage: parseInt(page), total });
});

// ======================
// MEETINGS
// ======================
exports.getAllMeetings = catchAsync(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const meetings = await Meeting.find()
    .sort('-startTime')
    .populate('host', 'fullName email')
    .limit(limit * 1)
    .skip((page - 1) * limit);
  const total = await Meeting.countDocuments();
  res.json({ success: true, meetings, totalPages: Math.ceil(total / limit), currentPage: parseInt(page), total });
});

exports.updateMeetingStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  if (!status) return next(new AppError('Status is required', 400));
  const meeting = await Meeting.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!meeting) return next(new AppError('Meeting not found', 404));
  res.json({ success: true, meeting });
});

// ======================
// WEEKLY CONTRIBUTIONS
// ======================
exports.getAllContributions = catchAsync(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const contributions = await WeeklyContribution.find()
    .sort('-date')
    .populate('gramVikasAdhikari', 'fullName email')
    .limit(limit * 1)
    .skip((page - 1) * limit);
  const total = await WeeklyContribution.countDocuments();
  res.json({ success: true, contributions, totalPages: Math.ceil(total / limit), currentPage: parseInt(page), total });
});