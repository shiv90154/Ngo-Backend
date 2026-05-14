// utils/sendEmail.js
const nodemailer = require("nodemailer");

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

const wrapInTemplate = (content, title) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #1a237e; margin:0;">Samraddh Bharat Foundation</h2>
      <p style="color: #555; font-size:14px;">Integrated Digital Management System</p>
    </div>
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px;">
      <h3 style="margin-top: 0; color: #1a237e;">${title}</h3>
      ${content}
    </div>
    <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #888;">
      <p style="margin:0;">Samraddh Bharat Foundation - Empowering Rural India</p>
      <p style="margin:4px 0 0 0;">This is an automated email. Please do not reply directly.</p>
    </div>
  </div>
`;

// 1. OTP Verification
const sendOTP = async (email, otp, expiryMinutes = 5) => {
  const content = `
    <p>Your One-Time Password (OTP) for verification is:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; background: #fff; padding: 10px; border-radius: 4px; border: 1px dashed #1a237e; margin: 15px 0;">
      ${otp}
    </div>
    <p>This OTP is valid for <strong>${expiryMinutes} minutes</strong>.</p>
    <p>If you did not request this, please ignore this email.</p>
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

// 2. Welcome Email (after registration)
const sendWelcome = async (email, fullName) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Welcome to <strong>Samraddh Bharat Foundation</strong>! Your account has been successfully created.</p>
    <p>You can now access our digital services:</p>
    <ul style="padding-left:20px;">
      <li>📚 Education – Online courses and live classes</li>
      <li>🏥 Healthcare – Book doctor appointments</li>
      <li>💰 Finance – Wallet, loans and bill payments</li>
      <li>📰 News & Media – Stay connected with local news</li>
      <li>🌾 Agriculture – AI crop tips and market prices</li>
    </ul>
    <p>If you have any questions, please contact our support team.</p>
  `;
  const html = wrapInTemplate(content, "🎉 Welcome to Samraddh Bharat!");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🎉 Welcome to Samraddh Bharat Foundation!",
    html,
  });
};

// 3. Password Reset Confirmation
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

// 4. PI Distribution Credited (formerly commission)
const sendPICredited = async (email, fullName, amount) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Congratulations! You have received <strong>₹${amount.toFixed(2)}</strong> as Project Incentive (PI).</p>
    <p>This amount has been credited to your wallet.</p>
  `;
  const html = wrapInTemplate(content, "💰 PI Distribution Credited!");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "💰 PI Distribution - Samraddh Bharat Foundation",
    html,
  });
};

// 5. Course Enrollment Confirmation
const sendCourseEnrollment = async (email, fullName, courseTitle) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>You have successfully enrolled in <strong>${courseTitle}</strong>.</p>
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

// 6. Loan Sanctioned
const sendLoanSanctioned = async (email, fullName, amount) => {
  const content = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Your loan of ₹${amount.toLocaleString()} has been sanctioned and credited to your wallet.</p>
    <p>Please check your loan details in the finance section.</p>
  `;
  const html = wrapInTemplate(content, "🏦 Loan Sanctioned");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🏦 Loan Sanctioned - Samraddh Finance",
    html,
  });
};

// 7. Donation Receipt (with attachment support)
const sendDonationReceipt = async (email, donorName, receiptPath) => {
  const content = `
    <p>Dear <strong>${donorName}</strong>,</p>
    <p>Thank you for your generous donation. Please find your receipt attached.</p>
    <p>Your support helps us build a better tomorrow.</p>
  `;
  const html = wrapInTemplate(content, "🧾 Donation Receipt");
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🧾 Donation Receipt - Samraddh Bharat Foundation",
    html,
    attachments: [
      {
        filename: 'donation_receipt.pdf',
        path: receiptPath,
      },
    ],
  });
};

// 8. Generic Email with Attachment (for future use)
const sendEmailWithAttachment = async ({ to, subject, html, attachments }) => {
  await getTransporter().sendMail({
    from: `"Samraddh Bharat Foundation" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
};

// 9. Generic Notification
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
// 12. Registration documents with PDF attachments
// ==================================
const sendRegistrationDocuments = async (email, fullName, attachments = []) => {
  const content = `
    <p>प्रिय <strong>${fullName}</strong>,</p>
    <p>आपका पंजीकरण सफलतापूर्वक हो गया है।</p>
    <p>आपका <strong>ID Card</strong> और <strong>Certificate</strong> इस ईमेल के साथ PDF के रूप में संलग्न हैं।</p>
  `;

  const html = wrapInTemplate(content, "✅ पंजीकरण दस्तावेज़");

  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "✅ आपका ID Card और Certificate - समृद्ध भारत फाउंडेशन",
    html,
    attachments,
  });
};

module.exports = {
  sendOTP,
  sendWelcome,
  sendPasswordReset,
  sendPICredited,
  sendCourseEnrollment,
  sendLoanSanctioned,
  sendDonationReceipt,
  sendEmailWithAttachment,
  sendNotification,
  sendRegistrationDocuments,
};