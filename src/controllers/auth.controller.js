// backend/src/controllers/auth.controller.js
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');
const path = require('path');
const fs = require('fs').promises;
const { validationResult } = require('express-validator');
const { generateCertificate } = require("../services/certificateGenerator");
const { generateIdCard } = require("../services/idCardGenerator");

const VALID_ROLES = [
  'SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_DEVELOPMENT_COORDINATOR',
  'DISTRICT_BRANCH_MANAGER', 'DISTRICT_PRESIDENT', 'DISTRICT_FIELD_COORDINATOR',
  'BAMS_DOCTOR', 'BLOCK_DEVELOPMENT_COORDINATOR', 'GRAM_DEVELOPMENT_COORDINATOR',
  'IT_DEVELOPER', 'TEACHER', 'NEWS_EDITOR', 'AGRICULTURE_CONSULTANCY',
  'FINANCE_SERVICE_CONSULTANCY', 'NGO_CONSULTANCY', 'PROJECT_BASED_INTEGRATED_ROLE',
  'VENDOR', 'AGENT', 'USER',
];

const ROLES_REQUIRING_SPONSOR = [
  'ADDITIONAL_DIRECTOR', 'STATE_DEVELOPMENT_COORDINATOR', 'DISTRICT_BRANCH_MANAGER',
  'DISTRICT_PRESIDENT', 'DISTRICT_FIELD_COORDINATOR', 'BAMS_DOCTOR',
  'BLOCK_DEVELOPMENT_COORDINATOR', 'GRAM_DEVELOPMENT_COORDINATOR', 'VENDOR', 'AGENT',
];

const uploadDir = path.join(__dirname, '../uploads');
(async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
})();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashOTP = async (otp) => bcrypt.hash(otp, 10);
const verifyOTP = async (plainOtp, hashedOtp) => bcrypt.compare(plainOtp, hashedOtp);

const parseArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

// ====================== REGISTER ======================
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const {
      fullName, name, email, phone, mobile, password, role, modules,
      fatherName, motherName, dob, dateOfBirth, gender,
      aadhaarNumber, aadharCard, panNumber, panCard, voterId, passportNumber,
      state, district, block, village, pincode, fullAddress,
      reportsTo, sponsorId, sponsorReferral,
      specialization, qualifications, experienceYears,
      doctorSpecialization, doctorExperience, consultationFee, registrationNumber,
      qualification, college, yearOfPassing, medicalCouncilRegNumber,
      landSize, crops, farmingType, isContractFarmer, farmLocation, irrigationType,
      className, schoolName, board, percentage,
      projectType, techStack, experience,
      username, bio, interests,
      bankAccount, isMediaCreator, isSeller, storeName, gstNumber,
      upiId, developedBy, testedBy, qaStatus
    } = req.body;

    const finalName = fullName || name;
    const finalEmail = email;
    const finalPhone = phone || mobile;
    const finalDob = dob || dateOfBirth;
    const finalAadhaar = aadhaarNumber || aadharCard;
    const finalPan = panNumber || panCard;

    if (!finalName || !finalEmail || !finalPhone || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ $or: [{ email: finalEmail }, { phone: finalPhone }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    let resolvedSponsor = null;
    if (sponsorId) {
      resolvedSponsor = await User.findById(sponsorId);
      if (!resolvedSponsor) return res.status(400).json({ success: false, message: 'Invalid sponsor ID' });
    } else if (sponsorReferral && sponsorReferral.trim() !== '') {
      resolvedSponsor = await User.findOne({ referralCode: sponsorReferral.trim() });
      if (!resolvedSponsor) return res.status(400).json({ success: false, message: 'Invalid sponsor referral code' });
    }

    let mappedRole = (role || 'USER').toUpperCase();
    if (!VALID_ROLES.includes(mappedRole)) mappedRole = 'USER';
    if (ROLES_REQUIRING_SPONSOR.includes(mappedRole) && !resolvedSponsor) {
      return res.status(400).json({ success: false, message: `रोल ${mappedRole} के लिए स्पॉन्सर रेफ़रल कोड अनिवार्य है।` });
    }
    if (resolvedSponsor && resolvedSponsor.email === finalEmail) {
      return res.status(400).json({ success: false, message: 'आप स्वयं अपने स्पॉन्सर नहीं बन सकते' });
    }

    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);

    let userModules = [];
    if (modules) {
      userModules = Array.isArray(modules) ? modules : [modules];
    } else {
      if (finalAadhaar || finalPan || voterId || passportNumber) userModules.push('FINANCE');
      if (doctorSpecialization || registrationNumber || qualification || college) userModules.push('HEALTHCARE');
      if (landSize || crops || farmLocation || irrigationType) userModules.push('AGRICULTURE');
      if (className || schoolName || board || percentage) userModules.push('EDUCATION');
      if (projectType || techStack || experience) userModules.push('IT');
      if (username || bio || interests) userModules.push('SOCIAL');
      if (isMediaCreator === 'true' || isMediaCreator === true) userModules.push('MEDIA');
      if (isSeller === 'true' || isSeller === true) userModules.push('ECOMMERCE');
    }

    const userData = {
      fullName: finalName, email: finalEmail, phone: finalPhone, password, role: mappedRole,
      modules: userModules, fatherName, motherName, dob: null,
      gender: gender && gender !== '' ? gender : undefined,
      aadhaarNumber: finalAadhaar, panNumber: finalPan, voterId, passportNumber,
      state, district, block, village, pincode, fullAddress,
      otp: hashedOtp, otpExpire: Date.now() + 5 * 60 * 1000,
      reportsTo: reportsTo || null, sponsorId: resolvedSponsor ? resolvedSponsor._id : null,
      createdBy: req.user ? req.user.id : null, updatedBy: req.user ? req.user.id : null,
      aiUsage: { diseaseDetectionCount: 0, aiTokensRemaining: 10 },
      incentivePayoutInfo: { pendingIncentive: 0, totalWithdrawn: 0 },
      paymentInfo: {}, twoFactorEnabled: false, isDeleted: false,
      developedBy: developedBy || null, testedBy: testedBy || null, qaStatus: qaStatus || 'pending',
      licenseStats: { totalLicensesSold: 0, monthlyLicensesSold: 0, lastMonthReset: new Date(), salaryEligible: false },
      contractStatus: 'draft',
    };

    if (finalDob) {
      const parsedDob = new Date(finalDob);
      if (!isNaN(parsedDob.getTime())) userData.dob = parsedDob;
    }
    if (upiId) userData.paymentInfo.upiId = upiId;

    if (mappedRole === 'TEACHER' || userModules.includes('EDUCATION')) {
      userData.teacherProfile = {
        specialization: specialization || '',
        qualifications: parseArray(qualifications),
        experienceYears: experienceYears ? parseInt(experienceYears) : 0,
        earnings: 0,
      };
    }
    if (mappedRole === 'BAMS_DOCTOR' || userModules.includes('HEALTHCARE')) {
      userData.doctorProfile = {
        specialization: doctorSpecialization || '',
        experienceYears: doctorExperience ? parseInt(doctorExperience) : 0,
        consultationFee: consultationFee ? parseFloat(consultationFee) : 0,
        registrationNumber: registrationNumber || '',
      };
      userData.doctorVerification = {
        qualification: qualification || '', college: college || '',
        yearOfPassing: yearOfPassing ? parseInt(yearOfPassing) : null,
        medicalCouncilRegNumber: medicalCouncilRegNumber || '',
        verificationStatus: 'pending',
      };
    }
    if (userModules.includes('AGRICULTURE')) {
      userData.farmerProfile = {
        landSize: landSize ? parseInt(landSize) : 0,
        crops: parseArray(crops),
        farmingType: farmingType || 'conventional',
        isContractFarmer: isContractFarmer === 'true' || isContractFarmer === true,
        farmLocation: farmLocation || '', irrigationType: irrigationType || '',
      };
    }
    if (userModules.includes('EDUCATION')) {
      userData.educationProfile = { className: className || '', schoolName: schoolName || '', board: board || '', percentage: percentage || '' };
    }
    if (userModules.includes('IT')) {
      userData.itProfile = { projectType: projectType || '', techStack: techStack || '', experience: experience || '' };
    }
    if (userModules.includes('SOCIAL')) {
      userData.socialProfile = { username: username || '', bio: bio || '', interests: interests || '', followersCount: 0, followingCount: 0 };
    }
    if (userModules.includes('MEDIA') || isMediaCreator === 'true' || isMediaCreator === true) {
      userData.mediaCreatorProfile = { isCreator: true, creatorStatus: 'pending', totalPosts: 0, totalFollowers: 0, monetizationEarnings: 0, liveStreamingKey: Math.random().toString(36).substring(2, 15) };
    }
    if (userModules.includes('ECOMMERCE') || isSeller === 'true' || isSeller === true) {
      userData.sellerProfile = { isSeller: true, storeName: storeName || `${finalName}'s Store`, gstNumber: gstNumber || '', rating: 0 };
    }
    if (bankAccount) {
      try {
        userData.bankAccount = typeof bankAccount === 'string' ? JSON.parse(bankAccount) : bankAccount;
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid bankAccount JSON' });
      }
    }

    const user = new User(userData);

    if (req.files) {
      const moveFile = async (fieldName, prefix) => {
        const file = req.files[fieldName]?.[0];
        if (file) {
          const ext = path.extname(file.originalname);
          const fileName = `${Date.now()}_${prefix}_${Math.random().toString(36).substring(2)}${ext}`;
          const newPath = path.join(uploadDir, fileName);
          await fs.rename(file.path, newPath);
          return `/uploads/${fileName}`;
        }
        return null;
      };

      const profileImage = await moveFile('profileImage', 'profile') || await moveFile('profilePicture', 'profile');
      if (profileImage) user.profileImage = profileImage;

      const aadhaarImg = await moveFile('aadhaarImage', 'aadhaar') || await moveFile('aadharDocument', 'aadhaar');
      if (aadhaarImg) user.aadhaarImage = aadhaarImg;

      const panImg = await moveFile('panImage', 'pan') || await moveFile('panDocument', 'pan');
      if (panImg) user.panImage = panImg;

      const storeLogo = await moveFile('storeLogo', 'store_logo');
      if (storeLogo) {
        if (!user.sellerProfile) user.sellerProfile = { isSeller: true, storeName: `${finalName}'s Store`, gstNumber: '', rating: 0 };
        user.sellerProfile.storeLogo = storeLogo;
      }
      const degreeCert = await moveFile('degreeCertificate', 'degree');
      const regCert = await moveFile('registrationCertificate', 'regcert');
      if (degreeCert || regCert) {
        user.doctorVerification = user.doctorVerification || {};
        if (degreeCert) user.doctorVerification.degreeCertificate = degreeCert;
        if (regCert) user.doctorVerification.registrationCertificate = regCert;
      }
    }

    if (resolvedSponsor) {
      resolvedSponsor.teamSize = (resolvedSponsor.teamSize || 0) + 1;
      if (!resolvedSponsor.leftChild) resolvedSponsor.leftChild = user._id;
      else if (!resolvedSponsor.rightChild) resolvedSponsor.rightChild = user._id;
      await resolvedSponsor.save();
    }

    await user.save();
    sendEmail.sendOTP(finalEmail, otp).catch(err => console.error('Email error:', err));

    res.status(201).json({ success: true, message: 'OTP sent to email. Please verify.', email: user.email });
  } catch (error) {
    if (req.files) {
      for (const field in req.files) {
        for (const file of req.files[field]) {
          await fs.unlink(file.path).catch(() => { });
        }
      }
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== VERIFY OTP ======================
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });
    const user = await User.findOne({ email });
    if (!user || !user.otp || !(await verifyOTP(otp, user.otp))) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (user.otpExpire < Date.now()) return res.status(400).json({ success: false, message: 'OTP expired' });
    user.isVerified = true;
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    // try { await sendEmail.sendWelcome(user.email, user.fullName); } catch (e) { }
    try {
      //     const certificateResult = await generateCertificate({
      //       recipientName: user.fullName,
      //       certificateType: "Membership Certificate",
      //       issueDate: new Date(),
      //       state: user.state,
      //       district: user.district,
      //       idNumber: user._id.toString(),
      //       photoPath: user.profileImage,
      //     });

      const idCardResult = await generateIdCard({
        name: user.fullName,
        role: user.role,
        phone: user.phone,
        email: user.email,
        photoPath: user.profileImage,
        idNumber: user._id.toString(),
      });
      const attachments = [
        //       {
        //         filename: `${user.fullName || "user"}-certificate.pdf`,
        //         path: certificateResult.filePath,
        //         contentType: "application/pdf",
        //       },
        {
          filename: `${user.fullName || "user"}-id-card.pdf`,
          path: idCardResult.filePath,
          contentType: "application/pdf",
        }
      ];

      await sendEmail.sendRegistrationDocuments(
        user.email,
        user.fullName,
        attachments
      );
    } catch (mailErr) {
      console.error("Registration documents email error:", mailErr);
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, modules: user.modules },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    const userData = user.toObject();
    delete userData.password;
    delete userData.otp;
    delete userData.otpExpire;

    res.json({ success: true, message: 'Account verified successfully', token, user: userData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== RESEND OTP ======================
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Already verified' });
    const otp = generateOTP();
    user.otp = await hashOTP(otp);
    user.otpExpire = Date.now() + 5 * 60 * 1000;
    await user.save();
    await sendEmail.sendOTP(email, otp);
    res.json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== LOGIN ======================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isDeleted) return res.status(403).json({ success: false, message: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ success: false, message: 'Please verify your email first' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    await user.updateLastLogin(req.ip, req.headers['user-agent']);

    const token = jwt.sign(
      { id: user._id, role: user.role, modules: user.modules },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    const userData = user.toObject();
    delete userData.password;
    delete userData.otp;
    delete userData.otpExpire;

    res.json({ success: true, message: 'Login successful', token, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== FORGOT PASSWORD - SEND OTP ======================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const otp = generateOTP();
    user.otp = await hashOTP(otp);
    user.otpExpire = Date.now() + 10 * 60 * 1000;
    await user.save();
    await sendEmail.sendOTP(email, otp).catch(err => console.error('Email error:', err));

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== VERIFY OTP FOR PASSWORD RESET ======================
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.otp || !(await verifyOTP(otp, user.otp)) || user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    res.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== RESET PASSWORD ======================
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: 'All fields are required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.otp || !(await verifyOTP(otp, user.otp)) || user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    try { await sendEmail.sendPasswordReset(user.email, user.fullName); } catch (e) { }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== GET PROFILE ======================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -otp -otpExpire')
      .populate('reportsTo', 'fullName email role')
      .populate('sponsorId', 'fullName email');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== UPDATE PROFILE ======================
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const moveFile = async (fieldName, prefix) => {
      const file = req.files?.[fieldName]?.[0];
      if (!file) return null;
      if (user[fieldName]) {
        const oldPath = path.join(__dirname, '../', user[fieldName]);
        await fs.unlink(oldPath).catch(() => { });
      }
      const ext = path.extname(file.originalname);
      const fileName = `${Date.now()}_${prefix}_${Math.random().toString(36).substring(2)}${ext}`;
      const newPath = path.join(uploadDir, fileName);
      await fs.rename(file.path, newPath);
      const url = `/uploads/${fileName}`;
      user[fieldName] = url;
      return url;
    };

    await moveFile('profileImage', 'profile');
    await moveFile('profilePicture', 'profile');
    await moveFile('storeLogo', 'store_logo');

    const simpleFields = [
      'fullName', 'phone', 'fatherName', 'motherName', 'dob', 'gender',
      'state', 'district', 'block', 'village', 'pincode', 'fullAddress',
      'aadhaarNumber', 'panNumber', 'voterId', 'passportNumber',
    ];
    for (const key of simpleFields) {
      if (req.body[key] !== undefined) user[key] = req.body[key];
    }

    // UPI ID
    if (req.body.upiId !== undefined) {
      user.paymentInfo = user.paymentInfo || {};
      user.paymentInfo.upiId = req.body.upiId;
    }

    // Teacher profile
    if (req.body.teacherSpecialization !== undefined || req.body.qualifications !== undefined || req.body.teacherExperience !== undefined) {
      user.teacherProfile = user.teacherProfile || {};
      if (req.body.teacherSpecialization !== undefined) user.teacherProfile.specialization = req.body.teacherSpecialization;
      if (req.body.qualifications !== undefined) user.teacherProfile.qualifications = parseArray(req.body.qualifications);
      if (req.body.teacherExperience !== undefined) user.teacherProfile.experienceYears = parseInt(req.body.teacherExperience);
    }

    // Doctor profile
    if (req.body.doctorSpecialization !== undefined || req.body.doctorExperience !== undefined || req.body.consultationFee !== undefined || req.body.registrationNumber !== undefined) {
      user.doctorProfile = user.doctorProfile || {};
      if (req.body.doctorSpecialization !== undefined) user.doctorProfile.specialization = req.body.doctorSpecialization;
      if (req.body.doctorExperience !== undefined) user.doctorProfile.experienceYears = parseInt(req.body.doctorExperience);
      if (req.body.consultationFee !== undefined) user.doctorProfile.consultationFee = parseFloat(req.body.consultationFee);
      if (req.body.registrationNumber !== undefined) user.doctorProfile.registrationNumber = req.body.registrationNumber;
    }
    // Doctor verification
    if (req.body.qualification !== undefined || req.body.college !== undefined || req.body.yearOfPassing !== undefined || req.body.medicalCouncilRegNumber !== undefined) {
      user.doctorVerification = user.doctorVerification || {};
      if (req.body.qualification !== undefined) user.doctorVerification.qualification = req.body.qualification;
      if (req.body.college !== undefined) user.doctorVerification.college = req.body.college;
      if (req.body.yearOfPassing !== undefined) user.doctorVerification.yearOfPassing = parseInt(req.body.yearOfPassing);
      if (req.body.medicalCouncilRegNumber !== undefined) user.doctorVerification.medicalCouncilRegNumber = req.body.medicalCouncilRegNumber;
    }
    const degreeCert = await moveFile('degreeCertificate', 'degree');
    if (degreeCert) {
      user.doctorVerification = user.doctorVerification || {};
      user.doctorVerification.degreeCertificate = degreeCert;
    }
    const regCert = await moveFile('registrationCertificate', 'regcert');
    if (regCert) {
      user.doctorVerification = user.doctorVerification || {};
      user.doctorVerification.registrationCertificate = regCert;
    }

    // Farmer profile
    if (req.body.landSize !== undefined || req.body.crops !== undefined || req.body.farmingType !== undefined || req.body.isContractFarmer !== undefined || req.body.farmLocation !== undefined || req.body.irrigationType !== undefined) {
      user.farmerProfile = user.farmerProfile || {};
      if (req.body.landSize !== undefined) user.farmerProfile.landSize = parseInt(req.body.landSize);
      if (req.body.crops !== undefined) user.farmerProfile.crops = parseArray(req.body.crops);
      if (req.body.farmingType !== undefined) user.farmerProfile.farmingType = req.body.farmingType;
      if (req.body.isContractFarmer !== undefined) user.farmerProfile.isContractFarmer = req.body.isContractFarmer === 'true' || req.body.isContractFarmer === true;
      if (req.body.farmLocation !== undefined) user.farmerProfile.farmLocation = req.body.farmLocation;
      if (req.body.irrigationType !== undefined) user.farmerProfile.irrigationType = req.body.irrigationType;
    }

    // Education profile
    if (req.body.className !== undefined || req.body.schoolName !== undefined || req.body.board !== undefined || req.body.percentage !== undefined) {
      user.educationProfile = user.educationProfile || {};
      if (req.body.className !== undefined) user.educationProfile.className = req.body.className;
      if (req.body.schoolName !== undefined) user.educationProfile.schoolName = req.body.schoolName;
      if (req.body.board !== undefined) user.educationProfile.board = req.body.board;
      if (req.body.percentage !== undefined) user.educationProfile.percentage = req.body.percentage;
    }

    // IT profile
    if (req.body.projectType !== undefined || req.body.techStack !== undefined || req.body.experience !== undefined) {
      user.itProfile = user.itProfile || {};
      if (req.body.projectType !== undefined) user.itProfile.projectType = req.body.projectType;
      if (req.body.techStack !== undefined) user.itProfile.techStack = req.body.techStack;
      if (req.body.experience !== undefined) user.itProfile.experience = req.body.experience;
    }

    // Social profile
    if (req.body.username !== undefined || req.body.bio !== undefined || req.body.interests !== undefined) {
      user.socialProfile = user.socialProfile || {};
      if (req.body.username !== undefined) user.socialProfile.username = req.body.username;
      if (req.body.bio !== undefined) user.socialProfile.bio = req.body.bio;
      if (req.body.interests !== undefined) user.socialProfile.interests = req.body.interests;
    }

    // Media creator
    if (req.body.isMediaCreator !== undefined) {
      const isCreator = req.body.isMediaCreator === 'true' || req.body.isMediaCreator === true;
      if (isCreator && !user.mediaCreatorProfile) {
        user.mediaCreatorProfile = { isCreator: true, creatorStatus: 'pending', totalPosts: 0, totalFollowers: 0, monetizationEarnings: 0, liveStreamingKey: Math.random().toString(36).substring(2, 15) };
      } else if (!isCreator && user.mediaCreatorProfile) {
        user.mediaCreatorProfile = null;
      }
    }

    // Seller profile
    if (req.body.isSeller !== undefined) {
      const isSeller = req.body.isSeller === 'true' || req.body.isSeller === true;
      if (isSeller && !user.sellerProfile) {
        user.sellerProfile = { isSeller: true, storeName: req.body.storeName || `${user.fullName}'s Store`, gstNumber: req.body.gstNumber || '', rating: 0 };
      } else if (!isSeller && user.sellerProfile) {
        user.sellerProfile = null;
      } else if (user.sellerProfile) {
        if (req.body.storeName) user.sellerProfile.storeName = req.body.storeName;
        if (req.body.gstNumber) user.sellerProfile.gstNumber = req.body.gstNumber;
      }
    }

    // Bank account
    if (req.body.bankAccount !== undefined) {
      try {
        user.bankAccount = typeof req.body.bankAccount === 'string' ? JSON.parse(req.body.bankAccount) : req.body.bankAccount;
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid bankAccount JSON' });
      }
    }

    // QA / dev fields
    if (req.body.twoFactorEnabled !== undefined) user.twoFactorEnabled = req.body.twoFactorEnabled === 'true' || req.body.twoFactorEnabled === true;
    if (req.body.developedBy !== undefined) user.developedBy = req.body.developedBy;
    if (req.body.testedBy !== undefined) user.testedBy = req.body.testedBy;
    if (req.body.qaStatus !== undefined) user.qaStatus = req.body.qaStatus;

    user.updatedBy = req.user.id;
    await user.save();

    const userData = user.toObject();
    delete userData.password;
    delete userData.otp;
    delete userData.otpExpire;

    res.json({ success: true, message: 'Profile updated', user: userData });
  } catch (error) {
    // Cleanup files if needed
    if (req.files) {
      for (const field in req.files) {
        for (const file of req.files[field]) {
          await fs.unlink(file.path).catch(() => { });
        }
      }
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== ASSIGN HIERARCHY ======================
exports.assignReporting = async (req, res) => {
  try {
    const { userId, reportsToId, sponsorId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (reportsToId) {
      const superior = await User.findById(reportsToId);
      if (!superior) return res.status(404).json({ success: false, message: 'Superior not found' });
      user.reportsTo = reportsToId;
    }
    if (sponsorId) {
      const sponsor = await User.findById(sponsorId);
      if (!sponsor) return res.status(404).json({ success: false, message: 'Sponsor not found' });
      user.sponsorId = sponsorId;
    }
    user.updatedBy = req.user.id;
    await user.save();
    res.json({ success: true, message: 'Hierarchy updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== GET SUBORDINATES ======================
exports.getSubordinates = async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;
    const subordinates = await User.find({ reportsTo: userId, isDeleted: false }).select('fullName email role');
    const networkDownlines = await User.find({ sponsorId: userId, isDeleted: false }).select('fullName email role teamSize');
    res.json({ success: true, officialSubordinates: subordinates, networkDownlines });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== GET ALL USERS (Admin) ======================
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isVerified, page = 1, limit = 20, includeDeleted } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
    if (includeDeleted !== 'true') filter.isDeleted = false;
    const users = await User.find(filter).select('-password -otp -otpExpire').limit(limit * 1).skip((page - 1) * limit).sort({ createdAt: -1 });
    const total = await User.countDocuments(filter);
    res.json({ success: true, users, totalPages: Math.ceil(total / limit), currentPage: page, total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== GET USER BY ID (Admin) ======================
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otp -otpExpire').populate('reportsTo sponsorId', 'fullName email role');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== DELETE USER (Admin) ======================
exports.deleteUser = async (req, res) => {
  try {
    const { hardDelete } = req.query;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (hardDelete === 'true') {
      if (user.profileImage) {
        const fp = path.join(__dirname, '../', user.profileImage);
        await fs.unlink(fp).catch(() => { });
      }
      await User.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'User permanently deleted' });
    } else {
      user.isDeleted = true; user.deletedAt = new Date(); user.isActive = false;
      await user.save();
      res.json({ success: true, message: 'User deactivated (soft delete)' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== RESTORE USER ======================
exports.restoreUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isDeleted = false; user.deletedAt = null; user.isActive = true;
    await user.save();
    res.json({ success: true, message: 'User restored' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== UPDATE AI TOKENS (Admin) ======================
exports.updateAITokens = async (req, res) => {
  try {
    const { userId, tokens } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.aiUsage = user.aiUsage || {};
    user.aiUsage.aiTokensRemaining = parseInt(tokens);
    await user.save();
    res.json({ success: true, message: 'AI tokens updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== INCREMENT AI USAGE ======================
exports.incrementAIUsage = async (req, res) => {
  try {
    const { type } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.aiUsage = user.aiUsage || {};
    if (type === 'disease') user.aiUsage.diseaseDetectionCount = (user.aiUsage.diseaseDetectionCount || 0) + 1;
    user.aiUsage.lastDetectionAt = new Date();
    if (user.aiUsage.aiTokensRemaining > 0) user.aiUsage.aiTokensRemaining -= 1;
    await user.save();
    res.json({ success: true, aiUsage: user.aiUsage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== ADD SUBSCRIPTION HISTORY ======================
exports.addSubscriptionHistory = async (req, res) => {
  try {
    const { userId, plan, startDate, endDate, amountPaid, transactionId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.subscriptionHistory.push({ plan, startDate: new Date(startDate), endDate: new Date(endDate), amountPaid, transactionId });
    user.activeSubscription = { plan, expiresAt: new Date(endDate), autoRenew: user.activeSubscription?.autoRenew || false };
    await user.save();
    res.json({ success: true, message: 'Subscription history added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== UPDATE INCENTIVE PAYOUT ======================
exports.updateIncentivePayout = async (req, res) => {
  try {
    const { userId, pendingIncentive, totalWithdrawn, lastPayoutDate, nextPayoutDate } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.incentivePayoutInfo = user.incentivePayoutInfo || {};
    if (pendingIncentive !== undefined) user.incentivePayoutInfo.pendingIncentive = pendingIncentive;
    if (totalWithdrawn !== undefined) user.incentivePayoutInfo.totalWithdrawn = totalWithdrawn;
    if (lastPayoutDate) user.incentivePayoutInfo.lastPayoutDate = new Date(lastPayoutDate);
    if (nextPayoutDate) user.incentivePayoutInfo.nextPayoutDate = new Date(nextPayoutDate);
    await user.save();
    res.json({ success: true, incentivePayoutInfo: user.incentivePayoutInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== UPDATE WALLET ======================
exports.updateWallet = async (req, res) => {
  try {
    const { userId, amount, operation } = req.body;
    if (!userId || amount === undefined || !operation) return res.status(400).json({ success: false, message: 'Missing required fields' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (operation === 'add') {
      user.walletBalance = (user.walletBalance || 0) + amount;
      user.totalEarnings = (user.totalEarnings || 0) + amount;
    } else if (operation === 'deduct') {
      if ((user.walletBalance || 0) < amount) return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      user.walletBalance = (user.walletBalance || 0) - amount;
    } else return res.status(400).json({ success: false, message: 'Invalid operation' });
    await user.save();
    res.json({ success: true, walletBalance: user.walletBalance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== ADD HEALTH RECORD ======================
exports.addHealthRecord = async (req, res) => {
  try {
    const { recordType, title, description, date } = req.body;
    const userId = req.params.userId || req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    let fileUrl = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const fileName = `${Date.now()}_health_${Math.random().toString(36).substring(2)}${ext}`;
      const newPath = path.join(uploadDir, fileName);
      await fs.rename(req.file.path, newPath);
      fileUrl = `/uploads/${fileName}`;
    }
    user.healthRecords.push({ recordType, title, description, fileUrl, date: date ? new Date(date) : new Date(), doctorId: req.user.id });
    await user.save();
    res.json({ success: true, message: 'Health record added' });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => { });
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== ADD PRODUCT LISTING ======================
exports.addProductListing = async (req, res) => {
  try {
    const { name, price, quantity, unit, category, description } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    let imageUrl = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const fileName = `${Date.now()}_product_${Math.random().toString(36).substring(2)}${ext}`;
      const newPath = path.join(uploadDir, fileName);
      await fs.rename(req.file.path, newPath);
      imageUrl = `/uploads/${fileName}`;
    }
    user.productListings.push({ name, price: parseFloat(price), quantity: parseFloat(quantity), unit, category, description, imageUrl, sellerId: userId, createdAt: new Date() });
    await user.save();
    res.json({ success: true, message: 'Product added' });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => { });
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== ADD CONTRACT FARMING ======================
exports.addContractFarming = async (req, res) => {
  try {
    const { buyerId, quantity, pricePerUnit, startDate, endDate } = req.body;
    const farmer = await User.findById(req.user.id);
    if (!farmer || !farmer.farmerProfile) return res.status(400).json({ success: false, message: 'User is not a farmer' });
    const buyer = await User.findById(buyerId);
    if (!buyer) return res.status(404).json({ success: false, message: 'Buyer not found' });
    farmer.contractFarmingAgreements.push({ buyerId, quantity: parseFloat(quantity), pricePerUnit: parseFloat(pricePerUnit), startDate: new Date(startDate), endDate: new Date(endDate), status: 'pending' });
    await farmer.save();
    res.json({ success: true, message: 'Contract farming request sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== ADD LOAN ======================
exports.addLoan = async (req, res) => {
  try {
    const { amount, emiAmount, tenureMonths } = req.body;
    const userId = req.params.userId || req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.loans.push({ amount: parseFloat(amount), emiAmount: parseFloat(emiAmount), tenureMonths: parseInt(tenureMonths), outstanding: parseFloat(amount), nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), status: 'active', sanctionedAt: new Date() });
    await user.save();
    res.json({ success: true, message: 'Loan added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== ADD CLIENT ======================
exports.addClient = async (req, res) => {
  try {
    const { name, email, phone, company, gstNumber, address } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.clients.push({ name, email, phone, company, gstNumber, address, createdBy: userId, createdAt: new Date() });
    await user.save();
    res.json({ success: true, message: 'Client added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== ADD PROJECT ======================
exports.addProject = async (req, res) => {
  try {
    const { name, description, clientId, startDate, endDate, budget } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.projects.push({ name, description, clientId, startDate: new Date(startDate), endDate: new Date(endDate), budget: parseFloat(budget), status: 'active', createdBy: userId, createdAt: new Date() });
    await user.save();
    res.json({ success: true, message: 'Project added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== ADD STORE PRODUCT ======================
exports.addStoreProduct = async (req, res) => {
  try {
    const { name, price, category, stock, description } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user || !user.sellerProfile) return res.status(400).json({ success: false, message: 'User is not a seller' });
    let imageUrl = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const fileName = `${Date.now()}_store_${Math.random().toString(36).substring(2)}${ext}`;
      const newPath = path.join(uploadDir, fileName);
      await fs.rename(req.file.path, newPath);
      imageUrl = `/uploads/${fileName}`;
    }
    user.storeProducts.push({ name, price: parseFloat(price), category, stock: parseInt(stock), description, imageUrl, sellerId: userId, createdAt: new Date() });
    await user.save();
    res.json({ success: true, message: 'Store product added' });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => { });
    res.status(500).json({ success: false, error: error.message });
  }
};