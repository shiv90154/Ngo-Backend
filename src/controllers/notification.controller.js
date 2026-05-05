// controllers/notification.controller.js
const Notification = require('../models/Notification');
const User = require('../models/user.model');
const Appointment = require('../models/Appointment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const LicensePurchase = require('../models/LicensePurchase');
const Meeting = require('../models/Meeting');
const WeeklyContribution = require('../models/WeeklyContribution');
const EducationProgram = require('../models/EducationProgram');
const ServiceRequest = require('../models/ServiceRequest');
const MedicineOrder = require('../models/MedicineOrder');
const CommissionLog = require('../models/CommissionLog');

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

exports.sendAgentNotification = async (req, res) => {
  try {
    const { recipientId, title, message } = req.body;
    const senderId = req.user.id;

    const agent = await User.findOne({ _id: senderId, role: 'AGENT' });
    if (!agent) return res.status(403).json({ success: false, message: 'Only agents can send' });

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ success: false, message: 'Recipient not found' });

    // Optional: client relationship check can be added here
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
// SYSTEM‑GENERATED NOTIFICATIONS
// ======================

// ---------- HEALTHCARE ----------
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

// 🆕 Doctor verification approved/rejected
exports.notifyDoctorVerification = async (doctorId, status, reason) => {
  try {
    const doctor = await User.findById(doctorId);
    if (!doctor) return;
    const title = status === 'approved' ? 'Doctor Profile Approved' : 'Doctor Profile Rejected';
    const message = status === 'approved'
      ? 'Congratulations! Your doctor profile has been verified. You can now start accepting appointments.'
      : `Your verification request was rejected. Reason: ${reason || 'No reason provided'}. Please update your documents.`;
    await safeCreate({
      recipient: doctorId,
      sender: null,
      type: 'doctor_verification',
      metadata: { title, message, verificationStatus: status },
    });
  } catch (err) {
    console.error('Doctor verification notification error:', err);
  }
};

// ---------- PHARMACY ----------
exports.notifyMedicineOrderStatus = async (orderId, newStatus) => {
  try {
    const order = await MedicineOrder.findById(orderId).populate('user');
    if (!order) return;
    const statusMessages = {
      confirmed: 'Your medicine order has been confirmed and is being processed.',
      shipped: 'Your medicine order has been shipped. You will receive it soon.',
      delivered: 'Your medicine order has been delivered.',
      cancelled: 'Your medicine order has been cancelled.',
    };
    const message = statusMessages[newStatus] || `Your order status is now ${newStatus}.`;
    await safeCreate({
      recipient: order.user._id,
      sender: null,
      type: 'medicine_order',
      metadata: {
        title: 'Medicine Order Update',
        message,
        orderId: order._id,
        status: newStatus,
      },
    });
  } catch (err) {
    console.error('Medicine order status notification error:', err);
  }
};

// ---------- LICENSES ----------
exports.notifyLicensePurchase = async (purchaseId) => {
  try {
    const purchase = await LicensePurchase.findById(purchaseId)
      .populate('soldBy', 'fullName email')
      .populate('licenseType', 'name incentiveAmount');
    if (!purchase) return;
    // Notify the seller
    await safeCreate({
      recipient: purchase.soldBy._id,
      sender: null,
      type: 'license_sold',
      metadata: {
        title: 'License Sold!',
        message: `You sold a ${purchase.licenseType.name} license. Incentive: ₹${purchase.licenseType.incentiveAmount}.`,
        purchaseId: purchase._id,
      },
    });
  } catch (err) {
    console.error('License purchase notification error:', err);
  }
};

exports.notifyCommissionCredited = async (commissionLog) => {
  try {
    if (!commissionLog.userId) return;
    await safeCreate({
      recipient: commissionLog.userId,
      sender: null,
      type: 'mlm_commission',
      metadata: {
        title: 'Commission Credited',
        message: `You have received ₹${commissionLog.amount} as commission.`,
        amount: commissionLog.amount,
        commissionLogId: commissionLog._id,
      },
    });
  } catch (err) {
    console.error('Commission notification error:', err);
  }
};

// ---------- MEETINGS ----------
exports.notifyMeetingCreated = async (meetingId) => {
  try {
    const meeting = await Meeting.findById(meetingId).populate('host participants');
    if (!meeting) return;
    // Notify each participant (except host)
    for (const participant of meeting.participants) {
      if (participant._id.toString() === meeting.host._id.toString()) continue;
      await safeCreate({
        recipient: participant._id,
        sender: meeting.host._id,
        type: 'meeting_invite',
        metadata: {
          title: 'Meeting Invitation',
          message: `You have been invited to "${meeting.title}" on ${new Date(meeting.startTime).toLocaleString()}.`,
          meetingId: meeting._id,
          meetingLink: meeting.meetingLink,
        },
      });
    }
  } catch (err) {
    console.error('Meeting notification error:', err);
  }
};

exports.notifyMeetingReminder = async (meetingId) => {
  try {
    const meeting = await Meeting.findById(meetingId).populate('host participants');
    if (!meeting) return;
    const all = [meeting.host._id, ...meeting.participants.map(p => p._id)];
    const unique = [...new Set(all.map(id => id.toString()))];
    for (const userId of unique) {
      await safeCreate({
        recipient: userId,
        sender: null,
        type: 'meeting_reminder',
        metadata: {
          title: 'Meeting Reminder',
          message: `"${meeting.title}" starts at ${new Date(meeting.startTime).toLocaleTimeString()}.`,
          meetingId: meeting._id,
        },
      });
    }
  } catch (err) {
    console.error('Meeting reminder error:', err);
  }
};

// ---------- WEEKLY CONTRIBUTIONS ----------
exports.notifyContributionRecorded = async (contributionId) => {
  try {
    const contribution = await WeeklyContribution.findById(contributionId).populate('gramVikasAdhikari');
    if (!contribution) return;
    await safeCreate({
      recipient: contribution.gramVikasAdhikari._id,
      sender: null,
      type: 'contribution_recorded',
      metadata: {
        title: 'Contribution Recorded',
        message: `Your weekly contribution of ₹${contribution.amount} for ${contribution.purpose} has been recorded.`,
        contributionId: contribution._id,
      },
    });
  } catch (err) {
    console.error('Contribution notification error:', err);
  }
};

// ---------- EDUCATION ----------
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
    // Also notify the student
    await safeCreate({
      recipient: enrollment.student,
      sender: null,
      type: 'course_enrolled',
      metadata: {
        title: 'Enrollment Confirmed',
        message: `You have successfully enrolled in "${course.title}".`,
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

// 🆕 Education program enrollment (Class 6‑12)
exports.notifyEducationProgramEnrolled = async (enrollment) => {
  try {
    const student = await User.findById(enrollment.student);
    const program = await EducationProgram.findById(enrollment.program);
    if (!student || !program) return;
    await safeCreate({
      recipient: enrollment.soldBy, // Gram Vikas Adhikari who enrolled the student
      sender: null,
      type: 'education_program_sold',
      metadata: {
        title: 'Student Enrolled',
        message: `You enrolled ${student.fullName} in Class ${program.class} program. Incentive: ₹${program.incentive}.`,
      },
    });
  } catch (err) {
    console.error('Education program notification error:', err);
  }
};

// ---------- SERVICE REQUESTS ----------
exports.notifyServiceRequestUpdate = async (requestId) => {
  try {
    const request = await ServiceRequest.findById(requestId).populate('user');
    if (!request) return;
    const statusMessages = {
      in_review: 'Your service request is being reviewed by an admin.',
      approved: 'Your service request has been approved.',
      rejected: 'Your service request was rejected.',
      completed: 'Your service request has been marked as completed.',
    };
    const message = statusMessages[request.status] || `Your request status is now ${request.status}.`;
    await safeCreate({
      recipient: request.user._id,
      sender: null,
      type: 'service_request',
      metadata: {
        title: 'Service Request Update',
        message,
        requestId: request._id,
        status: request.status,
      },
    });
  } catch (err) {
    console.error('Service request notification error:', err);
  }
};

// ---------- FINANCE ----------
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
    const Loan = require('../models/Loan.model');
    const loan = await Loan.findById(loanId);
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

// ---------- SUBSCRIPTION ----------
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

// ---------- MLM & EARNINGS ----------
exports.notifyMLMCommission = async (userId, amount) => {
  try {
    await safeCreate({
      recipient: userId,
      sender: null,
      type: 'mlm_commission',
      metadata: {
        title: 'MLM Commission Credited',
        message: `You have received ₹${amount} as MLM commission.`,
        amount,
      },
    });
  } catch (err) {
    console.error('MLM commission notification error:', err);
  }
};

// ---------- E‑COMMERCE / STORE ----------
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

// ---------- GLOBAL NOTIFICATIONS ----------
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