// utils/sendEmail.js
const nodemailer = require("nodemailer");

// ==================================
// Create transporter (reuse once)
// ==================================
let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

// ==================================
// Base HTML template
// ==================================
const wrapInTemplate = (content, title) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #1a237e; margin:0;">Samraddh Bharat Foundation</h2>
      <p style="color: #555; font-size:14px;">Integrated Digital Management System</p>
    </div>
    <!-- Content -->
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px;">
      <h3 style="margin-top: 0; color: #1a237e;">${title}</h3>
      ${content}
    </div>
    <!-- Footer -->
    <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #888;">
      <p style="margin:0;">Samraddh Bharat Foundation - Empowering Rural India</p>
      <p style="margin:4px 0 0 0;">This is an automated email. Please do not reply directly.</p>
    </div>
  </div>
`;

// ==================================
// 1. OTP Verification
// ==================================
const sendOTP = async (email, otp, expiryMinutes = 5) => {
  const content = `
    <p>Your One-Time Password (OTP) for verification is:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; background: #fff; padding: 10px; border-radius: 4px; border: 1px dashed #1a237e; margin: 15px 0;">
      ${otp}
    </div>
    <p>This OTP is valid for <strong>${expiryMinutes} minutes</strong>.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;
  const html = wrapInTemplate(content, "🔐 Email Verification");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔐 OTP Verification - Samraddh Bharat Foundation",
    text: `Your OTP is: ${otp} (valid for ${expiryMinutes} minutes)`,
    html,
  });
};

// ==================================
// 2. Welcome Email (after registration)
// ==================================
const sendWelcome = async (email, fullName) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Welcome to the <strong>Samraddh Bharat Foundation</strong>! Your account has been successfully created.</p>
    <p>You can now access our digital services including:</p>
    <ul style="padding-left:20px;">
      <li>📚 Education – online courses & live classes</li>
      <li>🏥 Healthcare – book doctor appointments</li>
      <li>💰 Finance – wallet, loans & bill payments</li>
      <li>📰 News & Media – stay updated with local stories</li>
      <li>🌾 Agriculture – AI crop tips & market prices</li>
    </ul>
    <p>If you have any questions, feel free to contact our support team.</p>
  `;
  const html = wrapInTemplate(content, "🎉 Welcome to Samraddh Bharat!");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🎉 Welcome to Samraddh Bharat Foundation!",
    html,
  });
};

// ==================================
// 3. Password Reset Confirmation
// ==================================
const sendPasswordReset = async (email, fullName) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Your password has been successfully reset.</p>
    <p>If you did not perform this action, please contact our support team immediately.</p>
  `;
  const html = wrapInTemplate(content, "🔒 Password Reset Successful");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔒 Password Reset - Samraddh Bharat Foundation",
    html,
  });
};

// ==================================
// 4. Subscription Activated
// ==================================
const sendSubscriptionActivated = async (email, fullName, planName, expiryDate) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Your subscription to the <strong>${planName}</strong> plan has been activated!</p>
    <p>Your plan will expire on: <strong>${new Date(expiryDate).toLocaleDateString()}</strong></p>
    <p>Enjoy premium features across the platform.</p>
  `;
  const html = wrapInTemplate(content, "⭐ Subscription Activated");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "⭐ Subscription Activated - Samraddh Bharat Foundation",
    html,
  });
};

// ==================================
// 5. Subscription Expiry Reminder
// ==================================
const sendSubscriptionExpiryReminder = async (email, fullName, planName, daysLeft) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Your <strong>${planName}</strong> subscription will expire in <strong>${daysLeft} day(s)</strong>.</p>
    <p>Renew now to continue enjoying premium features without interruption.</p>
    <p style="text-align:center;"><a href="${process.env.CLIENT_URL}/services/subscription" style="background:#1a237e;color:#fff;padding:10px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Renew Now</a></p>
  `;
  const html = wrapInTemplate(content, "⏳ Subscription Expiring Soon");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "⏳ Subscription Expiring Soon - Samraddh Bharat Foundation",
    html,
  });
};

// ==================================
// 6. MLM Commission Credited
// ==================================
const sendCommissionCredited = async (email, fullName, amount, source) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Congratulations! You have received a commission of <strong>₹${amount.toFixed(2)}</strong> from <strong>${source}</strong>.</p>
    <p>The amount has been added to your pending payout. It will be transferred to your wallet on the next payout cycle.</p>
  `;
  const html = wrapInTemplate(content, "💰 Commission Earned!");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "💰 Commission Earned - Samraddh Bharat Foundation",
    html,
  });
};

// ==================================
// 7. Appointment Confirmation
// ==================================
const sendAppointmentConfirmation = async (email, fullName, doctorName, date, timeSlot) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Your appointment with <strong>Dr. ${doctorName}</strong> has been confirmed.</p>
    <p>📅 Date: <strong>${new Date(date).toLocaleDateString()}</strong></p>
    <p>🕐 Time: <strong>${timeSlot}</strong></p>
    <p>Please be available on time. You can join via the link in your dashboard.</p>
  `;
  const html = wrapInTemplate(content, "📅 Appointment Confirmed");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "📅 Appointment Confirmed - Samraddh Healthcare",
    html,
  });
};

// ==================================
// 8. New Prescription Notification
// ==================================
const sendPrescriptionNotification = async (email, fullName, doctorName) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p><strong>Dr. ${doctorName}</strong> has issued a new prescription for you.</p>
    <p>You can view it in your dashboard under 'Prescriptions'.</p>
  `;
  const html = wrapInTemplate(content, "💊 New Prescription Issued");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "💊 New Prescription - Samraddh Healthcare",
    html,
  });
};

// ==================================
// 9. Course Enrollment Confirmation
// ==================================
const sendCourseEnrollment = async (email, fullName, courseTitle) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>You have successfully enrolled in the course: <strong>${courseTitle}</strong>.</p>
    <p>Start learning now from your dashboard.</p>
  `;
  const html = wrapInTemplate(content, "📚 Course Enrollment");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "📚 Course Enrollment - Samraddh Education",
    html,
  });
};

// ==================================
// 10. Loan Sanctioned
// ==================================
const sendLoanSanctioned = async (email, fullName, amount) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Your loan of <strong>₹${amount.toLocaleString()}</strong> has been sanctioned and credited to your wallet.</p>
    <p>Please check your loan details in the Finance section.</p>
  `;
  const html = wrapInTemplate(content, "🏦 Loan Sanctioned");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🏦 Loan Sanctioned - Samraddh Finance",
    html,
  });
};

// ==================================
// 11. Generic Notification (for any custom message)
// ==================================
const sendNotification = async (email, subject, title, message) => {
  const content = `<p>${message}</p>`;
  const html = wrapInTemplate(content, title);
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  });
};

// ==================================
// Main export (backward compatible)
// ==================================
module.exports = sendOTP;            // keep old signature for existing calls

// Named exports for new modules
module.exports.sendOTP = sendOTP;
module.exports.sendWelcome = sendWelcome;
module.exports.sendPasswordReset = sendPasswordReset;
module.exports.sendSubscriptionActivated = sendSubscriptionActivated;
module.exports.sendSubscriptionExpiryReminder = sendSubscriptionExpiryReminder;
module.exports.sendCommissionCredited = sendCommissionCredited;
module.exports.sendAppointmentConfirmation = sendAppointmentConfirmation;
module.exports.sendPrescriptionNotification = sendPrescriptionNotification;
module.exports.sendCourseEnrollment = sendCourseEnrollment;
module.exports.sendLoanSanctioned = sendLoanSanctioned;
module.exports.sendNotification = sendNotification;