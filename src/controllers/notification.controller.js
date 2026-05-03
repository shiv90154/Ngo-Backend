// controllers/notification.controller.js
const Notification = require('../models/Notification');
const User = require('../models/user.model');
const Appointment = require('../models/Appointment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Test = require('../models/Test');       // added for test results
const TestAttempt = require('../models/TestAttempt');

// ======================
// CRUD FOR CURRENT USER
// ======================

exports.getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, filter } = req.query;
    const query = { recipient: req.user.id };
    if (filter === 'unread') query.read = false;

    const notifications = await Notification.find(query)
      .populate('sender', 'fullName profileImage role')
      .populate('post', 'content media')
      .populate('comment', 'text')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ recipient: req.user.id, read: false });

    res.json({
      success: true,
      notifications,
      unreadCount,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id,
    });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// HELPER: SILENT CREATE
// ======================
const safeCreate = async (data) => {
  try {
    // Don't notify if sender and recipient are the same person
    if (data.recipient.toString() === data.sender?.toString()) return;
    await Notification.create(data);
  } catch (err) {
    console.error('Notification create error:', err.message);
  }
};

// ======================
// ROLE‑BASED PERSONAL MESSAGES
// ======================

// Doctor sends message to patient (must have past appointment)
exports.sendDoctorNotification = async (req, res) => {
  try {
    const { recipientId, title, message } = req.body;
    const senderId = req.user.id;

    const doctor = await User.findOne({ _id: senderId, role: 'DOCTOR' });
    if (!doctor) return res.status(403).json({ success: false, message: 'Only doctors can send' });

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ success: false, message: 'Recipient not found' });

    const hasAppointment = await Appointment.exists({ doctorId: senderId, patientId: recipientId });
    if (!hasAppointment) return res.status(403).json({ success: false, message: 'Not your patient' });

    await safeCreate({
      recipient: recipientId,
      sender: senderId,
      type: 'doctor_message',
      metadata: { title, message },
    });

    res.json({ success: true, message: 'Notification sent to patient' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Teacher sends message to student (must be enrolled in teacher's course)
exports.sendTeacherNotification = async (req, res) => {
  try {
    const { recipientId, title, message } = req.body;
    const senderId = req.user.id;

    const teacher = await User.findOne({ _id: senderId, role: 'TEACHER' });
    if (!teacher) return res.status(403).json({ success: false, message: 'Only teachers can send' });

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ success: false, message: 'Recipient not found' });

    const courses = await Course.find({ instructor: senderId }).distinct('_id');
    const isEnrolled = await Enrollment.exists({ student: recipientId, course: { $in: courses } });
    if (!isEnrolled) return res.status(403).json({ success: false, message: 'Not your student' });

    await safeCreate({
      recipient: recipientId,
      sender: senderId,
      type: 'teacher_message',
      metadata: { title, message },
    });

    res.json({ success: true, message: 'Notification sent to student' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Agent sends message to client (relationship check can be added later)
exports.sendAgentNotification = async (req, res) => {
  try {
    const { recipientId, title, message } = req.body;
    const senderId = req.user.id;

    const agent = await User.findOne({ _id: senderId, role: 'AGENT' });
    if (!agent) return res.status(403).json({ success: false, message: 'Only agents can send' });

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ success: false, message: 'Recipient not found' });

    // Optional: check agent-client relationship (if you have Client model)
    // const Client = require('../models/Client');
    // const isClient = await Client.exists({ createdBy: senderId, _id: recipientId });
    // if (!isClient) return res.status(403).json({ success: false, message: 'Not your client' });

    await safeCreate({
      recipient: recipientId,
      sender: senderId,
      type: 'agent_message',
      metadata: { title, message },
    });

    res.json({ success: true, message: 'Notification sent to client' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// SYSTEM‑GENERATED NOTIFICATIONS (called from other controllers)
// ======================

exports.notifyAppointmentReminder = async (appointmentId) => {
  try {
    const apt = await Appointment.findById(appointmentId).populate('patientId doctorId');
    if (!apt) return;
    await safeCreate({
      recipient: apt.patientId._id,
      sender: apt.doctorId._id,
      type: 'appointment_reminder',
      metadata: {
        title: 'Upcoming Appointment',
        message: `You have an appointment with Dr. ${apt.doctorId.fullName} on ${apt.appointmentDate.toLocaleString()}`,
        appointmentId: apt._id,
      },
    });
  } catch (err) {
    console.error('Appointment reminder error:', err);
  }
};

exports.notifyPrescriptionAdded = async (prescription) => {
  try {
    await safeCreate({
      recipient: prescription.patientId,
      sender: prescription.doctorId,
      type: 'prescription_added',
      metadata: {
        title: 'New Prescription',
        message: `Dr. ${prescription.doctorId?.fullName || 'Your doctor'} has issued a prescription.`,
        prescriptionId: prescription._id,
      },
    });
  } catch (err) {
    console.error('Prescription notification error:', err);
  }
};

exports.notifyCourseEnrolled = async (enrollment) => {
  try {
    const course = await Course.findById(enrollment.course).populate('instructor');
    const student = await User.findById(enrollment.student);
    await safeCreate({
      recipient: course.instructor._id,
      sender: enrollment.student,
      type: 'course_enrolled',
      metadata: {
        title: 'New Enrollment',
        message: `${student.fullName} enrolled in your course "${course.title}"`,
        courseId: course._id,
      },
    });
  } catch (err) {
    console.error('Enrollment notification error:', err);
  }
};

exports.notifyTestResult = async (attemptId) => {
  try {
    const attempt = await TestAttempt.findById(attemptId).populate('test');
    if (!attempt) return;
    const test = attempt.test;
    await safeCreate({
      recipient: attempt.student,
      sender: null,
      type: 'test_result',
      metadata: {
        title: 'Test Result Available',
        message: `You scored ${attempt.percentage}% on "${test.title}".`,
        testId: test._id,
      },
    });
    // Also notify the instructor
    const course = await Course.findById(test.course);
    if (course?.instructor) {
      const student = await User.findById(attempt.student);
      await safeCreate({
        recipient: course.instructor,
        sender: attempt.student,
        type: 'test_result',
        metadata: {
          title: 'Student Completed Test',
          message: `${student.fullName} scored ${attempt.percentage}% on "${test.title}".`,
          testId: test._id,
        },
      });
    }
  } catch (err) {
    console.error('Test result notification error:', err);
  }
};

// Optional: more system notifications (wallet, loan, etc.)
exports.notifyWalletCredited = async (userId, amount, description) => {
  try {
    await safeCreate({
      recipient: userId,
      sender: null,
      type: 'wallet_credited',
      metadata: {
        title: 'Wallet Credited',
        message: `₹${amount} has been added to your wallet. ${description || ''}`,
        amount,
      },
    });
  } catch (err) {
    console.error('Wallet notification error:', err);
  }
};

exports.notifyLoanSanctioned = async (loan) => {
  try {
    const user = await User.findById(loan.user);
    await safeCreate({
      recipient: loan.user,
      sender: null,
      type: 'loan_sanctioned',
      metadata: {
        title: 'Loan Sanctioned',
        message: `Your loan of ₹${loan.amount} has been approved and credited.`,
        loanId: loan._id,
      },
    });
  } catch (err) {
    console.error('Loan notification error:', err);
  }
};

exports.notifyEMIReminder = async (loanId) => {
  try {
    const loan = await require('../models/Loan.model').findById(loanId);
    if (!loan || loan.status !== 'active') return;
    await safeCreate({
      recipient: loan.user,
      sender: null,
      type: 'emi_reminder',
      metadata: {
        title: 'EMI Payment Reminder',
        message: `Your EMI of ₹${loan.emiAmount} is due on ${loan.nextDueDate.toLocaleDateString()}.`,
        loanId: loan._id,
      },
    });
  } catch (err) {
    console.error('EMI reminder error:', err);
  }
};

exports.notifyBillPaid = async (billPayment) => {
  try {
    await safeCreate({
      recipient: billPayment.user,
      sender: null,
      type: 'bill_paid',
      metadata: {
        title: 'Bill Payment Confirmed',
        message: `Your ${billPayment.billType} bill of ₹${billPayment.amount} has been paid.`,
      },
    });
  } catch (err) {
    console.error('Bill paid notification error:', err);
  }
};

exports.notifySubscriptionExpiry = async (userId, plan, daysLeft) => {
  try {
    await safeCreate({
      recipient: userId,
      sender: null,
      type: 'subscription_expiry',
      metadata: {
        title: 'Subscription Expiring Soon',
        message: `Your ${plan} subscription will expire in ${daysLeft} day(s). Renew now.`,
      },
    });
  } catch (err) {
    console.error('Subscription expiry notification error:', err);
  }
};

// Admin sends a global notification to all active users
exports.sendGlobalNotification = async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const activeUsers = await User.find({ isActive: true, isDeleted: false });
    const notifications = activeUsers.map(user => ({
      recipient: user._id,
      sender: req.user.id,
      type: 'global',
      metadata: { title, message },
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({ success: true, message: `Global notification sent to ${notifications.length} users` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.notifyMLMCommission = async (userId, amount) => {
  try {
    await safeCreate({
      recipient: userId,
      sender: null,
      type: 'mlm_commission',
      metadata: {
        title: 'Commission Credited',
        message: `You have received ₹${amount} as MLM commission.`,
        amount,
      },
    });
  } catch (err) {
    console.error('MLM commission notification error:', err);
  }
};

exports.notifyStoreOrder = async (sellerId, orderDetails) => {
  try {
    await safeCreate({
      recipient: sellerId,
      sender: null,
      type: 'store_order',
      metadata: {
        title: 'New Store Order',
        message: `You received a new order: ${orderDetails}.`,
      },
    });
  } catch (err) {
    console.error('Store order notification error:', err);
  }
};