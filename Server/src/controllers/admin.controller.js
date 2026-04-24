const User = require('../models/user.model');
const MediaPost = require('../models/MediaPost');
const Appointment = require('../models/Appointment');
const Transaction = require('../models/Transaction.model');
const Loan = require('../models/Loan.model');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// ------------------- DASHBOARD STATS -------------------
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
    res.json({
      success: true,
      stats: {
        totalUsers, activeUsers, doctors, teachers, totalPosts,
        totalAppointments, totalTransactions, activeLoans, totalCourses, totalEnrollments
      },
      recentUsers
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ------------------- USER MANAGEMENT -------------------
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, hierarchyLevel } = req.query;
    const query = { isDeleted: false };   // only active users
    if (role) query.role = role;
    if (hierarchyLevel) query.hierarchyLevel = parseInt(hierarchyLevel);
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -otp -otpExpire')
      .populate('reportsTo', 'fullName email role')
      .sort({ hierarchyLevel: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await User.countDocuments(query);

    res.json({ success: true, users, totalPages: Math.ceil(total / limit), currentPage: page, total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otp -otpExpire')
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

// ------------------- HIERARCHY -------------------
exports.getHierarchy = async (req, res) => {
  try {
    const users = await User.find({ isDeleted: false })
      .select('fullName role hierarchyLevel reportsTo email')
      .sort('hierarchyLevel');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSubordinates = async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;
    const subordinates = await User.find({ reportsTo: userId, isDeleted: false })
      .select('fullName email role hierarchyLevel');
    res.json({ success: true, subordinates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};