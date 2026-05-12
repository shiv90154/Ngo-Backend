// utils/sendEmail.js
const nodemailer = require("nodemailer");

// ==================================
// Transporter (एक बार बनाएँ, दोबारा इस्तेमाल करें)
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
// बेस HTML टेम्पलेट
// ==================================
const wrapInTemplate = (content, title) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <!-- हैडर -->
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #1a237e; margin:0;">समृद्ध भारत फाउंडेशन</h2>
      <p style="color: #555; font-size:14px;">एकीकृत डिजिटल प्रबंधन प्रणाली</p>
    </div>
    <!-- कंटेंट -->
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px;">
      <h3 style="margin-top: 0; color: #1a237e;">${title}</h3>
      ${content}
    </div>
    <!-- फुटर -->
    <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #888;">
      <p style="margin:0;">समृद्ध भारत फाउंडेशन - सशक्त ग्रामीण भारत</p>
      <p style="margin:4px 0 0 0;">यह एक स्वचालित ईमेल है। कृपया सीधे उत्तर न दें।</p>
    </div>
  </div>
`;

// ==================================
// 1. OTP सत्यापन
// ==================================
const sendOTP = async (email, otp, expiryMinutes = 5) => {
  const content = `
    <p>आपका वन-टाइम पासवर्ड (OTP) सत्यापन के लिए है:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; background: #fff; padding: 10px; border-radius: 4px; border: 1px dashed #1a237e; margin: 15px 0;">
      ${otp}
    </div>
    <p>यह OTP <strong>${expiryMinutes} मिनट</strong> के लिए मान्य है।</p>
    <p>यदि आपने यह अनुरोध नहीं किया है, तो कृपया इस ईमेल को अनदेखा करें।</p>
  `;
  const html = wrapInTemplate(content, "🔐 ईमेल सत्यापन");
  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔐 OTP सत्यापन - समृद्ध भारत फाउंडेशन",
    text: `आपका OTP है: ${otp} (${expiryMinutes} मिनट के लिए मान्य)`,
    html,
  });
};

// ==================================
// 2. स्वागत ईमेल (पंजीकरण के बाद)
// ==================================
const sendWelcome = async (email, fullName) => {
  const content = `
    <p>प्रिय <strong>${fullName}</strong>,</p>
    <p><strong>समृद्ध भारत फाउंडेशन</strong> में आपका स्वागत है! आपका खाता सफलतापूर्वक बना लिया गया है।</p>
    <p>अब आप हमारी डिजिटल सेवाओं का लाभ उठा सकते हैं:</p>
    <ul style="padding-left:20px;">
      <li>📚 शिक्षा – ऑनलाइन पाठ्यक्रम और लाइव कक्षाएँ</li>
      <li>🏥 स्वास्थ्य – डॉक्टर अपॉइंटमेंट बुक करें</li>
      <li>💰 वित्त – वॉलेट, लोन और बिल भुगतान</li>
      <li>📰 समाचार और मीडिया – स्थानीय खबरों से जुड़े रहें</li>
      <li>🌾 कृषि – AI फसल सुझाव और बाज़ार मूल्य</li>
    </ul>
    <p>यदि आपके कोई प्रश्न हों तो हमारी सहायता टीम से संपर्क करें।</p>
  `;
  const html = wrapInTemplate(content, "🎉 समृद्ध भारत में आपका स्वागत है!");
  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🎉 समृद्ध भारत फाउंडेशन में आपका स्वागत है!",
    html,
  });
};

// ==================================
// 3. पासवर्ड रीसेट पुष्टि
// ==================================
const sendPasswordReset = async (email, fullName) => {
  const content = `
    <p>प्रिय <strong>${fullName}</strong>,</p>
    <p>आपका पासवर्ड सफलतापूर्वक रीसेट कर दिया गया है।</p>
    <p>यदि आपने यह कार्रवाई नहीं की है, तो कृपया तुरंत हमारी सहायता टीम से संपर्क करें।</p>
  `;
  const html = wrapInTemplate(content, "🔒 पासवर्ड रीसेट सफल");
  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔒 पासवर्ड रीसेट - समृद्ध भारत फाउंडेशन",
    html,
  });
};

// ==================================
// 4. सदस्यता सक्रिय
// ==================================
const sendSubscriptionActivated = async (email, fullName, planName, expiryDate) => {
  const content = `
    <p>प्रिय <strong>${fullName}</strong>,</p>
    <p>आपकी <strong>${planName}</strong> योजना की सदस्यता सक्रिय हो गई है!</p>
    <p>आपकी योजना समाप्त होगी: <strong>${new Date(expiryDate).toLocaleDateString()}</strong></p>
    <p>प्लेटफ़ॉर्म पर प्रीमियम सुविधाओं का आनंद लें।</p>
  `;
  const html = wrapInTemplate(content, "⭐ सदस्यता सक्रिय");
  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "⭐ सदस्यता सक्रिय - समृद्ध भारत फाउंडेशन",
    html,
  });
};

// ==================================
// 5. सदस्यता समाप्ति सूचना
// ==================================
const sendSubscriptionExpiryReminder = async (email, fullName, planName, daysLeft) => {
  const content = `
    <p>प्रिय <strong>${fullName}</strong>,</p>
    <p>आपकी <strong>${planName}</strong> सदस्यता <strong>${daysLeft} दिन</strong> में समाप्त हो जाएगी।</p>
    <p>बिना किसी रुकावट के प्रीमियम सुविधाओं का लाभ उठाने के लिए अभी नवीनीकरण करें।</p>
    <p style="text-align:center;"><a href="${process.env.CLIENT_URL}/services/subscription" style="background:#1a237e;color:#fff;padding:10px 24px;text-decoration:none;border-radius:6px;display:inline-block;">नवीनीकरण करें</a></p>
  `;
  const html = wrapInTemplate(content, "⏳ सदस्यता जल्द समाप्त हो रही है");
  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "⏳ सदस्यता जल्द समाप्त - समृद्ध भारत फाउंडेशन",
    html,
  });
};

// ==================================
// 6. MLM कमीशन जमा
// ==================================
const sendCommissionCredited = async (email, fullName, amount, source) => {
  const content = `
    <p>प्रिय <strong>${fullName}</strong>,</p>
    <p>बधाई हो! आपको <strong>${source}</strong> से <strong>₹${amount.toFixed(2)}</strong> का कमीशन प्राप्त हुआ है।</p>
    <p>यह राशि आपके लंबित भुगतान में जोड़ दी गई है। यह अगले भुगतान चक्र में आपके वॉलेट में स्थानांतरित कर दी जाएगी।</p>
  `;
  const html = wrapInTemplate(content, "💰 कमीशन अर्जित!");
  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "💰 कमीशन अर्जित - समृद्ध भारत फाउंडेशन",
    html,
  });
};

// ==================================
// 7. अपॉइंटमेंट पुष्टि
// ==================================
const sendAppointmentConfirmation = async (email, fullName, doctorName, date, timeSlot) => {
  const content = `
    <p>प्रिय <strong>${fullName}</strong>,</p>
    <p><strong>डॉ. ${doctorName}</strong> के साथ आपका अपॉइंटमेंट पक्का हो गया है।</p>
    <p>📅 दिनांक: <strong>${new Date(date).toLocaleDateString()}</strong></p>
    <p>🕐 समय: <strong>${timeSlot}</strong></p>
    <p>कृपया समय पर उपलब्ध रहें। आप अपने डैशबोर्ड में दिए गए लिंक से जुड़ सकते हैं।</p>
  `;
  const html = wrapInTemplate(content, "📅 अपॉइंटमेंट पुष्टि");
  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "📅 अपॉइंटमेंट पुष्टि - समृद्ध स्वास्थ्य सेवा",
    html,
  });
};

// ==================================
// 8. नई पर्ची (प्रिस्क्रिप्शन) सूचना
// ==================================
const sendPrescriptionNotification = async (email, fullName, doctorName) => {
  const content = `
    <p>प्रिय <strong>${fullName}</strong>,</p>
    <p><strong>डॉ. ${doctorName}</strong> ने आपके लिए एक नई पर्ची जारी की है।</p>
    <p>आप इसे अपने डैशबोर्ड में 'प्रिस्क्रिप्शन' अनुभाग में देख सकते हैं।</p>
  `;
  const html = wrapInTemplate(content, "💊 नई पर्ची जारी");
  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "💊 नई पर्ची - समृद्ध स्वास्थ्य सेवा",
    html,
  });
};

// ==================================
// 9. कोर्स नामांकन पुष्टि
// ==================================
const sendCourseEnrollment = async (email, fullName, courseTitle) => {
  const content = `
    <p>प्रिय <strong>${fullName}</strong>,</p>
    <p>आपने <strong>${courseTitle}</strong> पाठ्यक्रम में सफलतापूर्वक नामांकन कर लिया है।</p>
    <p>अपने डैशबोर्ड से अभी सीखना शुरू करें।</p>
  `;
  const html = wrapInTemplate(content, "📚 कोर्स नामांकन");
  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "📚 कोर्स नामांकन - समृद्ध शिक्षा",
    html,
  });
};

// ==================================
// 10. लोन स्वीकृत
// ==================================
const sendLoanSanctioned = async (email, fullName, amount) => {
  const content = `
    <p>प्रिय <strong>${fullName}</strong>,</p>
    <p>आपका ₹${amount.toLocaleString()} का लोन स्वीकृत कर आपके वॉलेट में जमा कर दिया गया है।</p>
    <p>कृपया वित्त अनुभाग में अपने लोन का विवरण देखें।</p>
  `;
  const html = wrapInTemplate(content, "🏦 लोन स्वीकृत");
  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🏦 लोन स्वीकृत - समृद्ध वित्त",
    html,
  });
};

// ==================================
// 11. सामान्य सूचना (कस्टम संदेश)
// ==================================
const sendNotification = async (email, subject, title, message) => {
  const content = `<p>${message}</p>`;
  const html = wrapInTemplate(content, title);
  await getTransporter().sendMail({
    from: `"समृद्ध भारत फाउंडेशन" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  });
};

// ==================================
// ✅ फाइनल एक्सपोर्ट – कोई कन्फ्यूजन नहीं
// ==================================
module.exports = {
  sendOTP,
  sendWelcome,
  sendPasswordReset,
  sendSubscriptionActivated,
  sendSubscriptionExpiryReminder,
  sendCommissionCredited,
  sendAppointmentConfirmation,
  sendPrescriptionNotification,
  sendCourseEnrollment,
  sendLoanSanctioned,
  sendNotification,
};