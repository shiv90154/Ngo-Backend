// backend/seeds/seedAll.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const LicenseType = require('../models/LicenseType');
const EducationProgram = require('../models/EducationProgram');
const CommissionSplit = require('../models/CommissionSplit');



async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected for seeding');

    // ─── 1. Super Admin ───────────────────────────────────
    const superAdminEmail = 'iph08@inphora.in';
    const superAdminPassword = 'Admin@2025#Secure';  // 🔐 मज़बूत पासवर्ड (याद रखना)

    const existingAdmin = await User.findOne({ email: superAdminEmail });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
      await User.create({
        fullName: 'Super Admin',
        email: superAdminEmail,
        phone: '7004674232',          // अपना फोन नंबर डाल सकते हैं
        password: superAdminPassword, // pre‑save hook खुद हैश करेगा
        role: 'SUPER_ADMIN',
        isVerified: true,
        isActive: true,
        referralCode: 'ADMIN01',
        state: 'All',
        district: 'All',
        block: 'Headquarters',
        village: 'Main Office',
        contractStatus: 'completed',
      });
      console.log('✅ Super Admin created');
      console.log(`   📧 Email: ${superAdminEmail}`);
      console.log(`   🔑 Password: ${superAdminPassword}`);
    } else {
      console.log('⚠️ Super Admin already exists');
    }

    // ─── 2. License Types ────────────────────────────────
    const licenseTypes = [
      { name: 'Kishori Care', code: 'KC001', membershipFee: 500, incentiveAmount: 50, description: 'किशोरी स्वास्थ्य देखभाल योजना' },
      { name: 'Mahila Suraksha', code: 'MS002', membershipFee: 1000, incentiveAmount: 100, description: 'महिला सुरक्षा एवं स्वास्थ्य' },
      { name: 'Urja Health', code: 'UH003', membershipFee: 1500, incentiveAmount: 150, description: 'सामान्य स्वास्थ्य बीमा' },
      { name: 'Annadata Jaivik', code: 'AJ004', membershipFee: 800, incentiveAmount: 80, description: 'किसान जैविक खेती सहायता' },
      { name: 'MSDR Family Health', code: 'MFH005', membershipFee: 2000, incentiveAmount: 200, description: 'पारिवारिक स्वास्थ्य कवर' },
    ];

    for (const lic of licenseTypes) {
      const existing = await LicenseType.findOne({ code: lic.code });
      if (!existing) {
        await LicenseType.create(lic);
        console.log(`✅ License type '${lic.name}' created`);
      } else {
        console.log(`⚠️ License type '${lic.name}' already exists`);
      }
    }

    // ─── 3. Education Programs ────────────────────────────
    const educationPrograms = [];
    for (let cls = 6; cls <= 12; cls++) {
      educationPrograms.push({
        class: cls,
        fee: 300 + (cls - 6) * 50,      // ₹300 से शुरू, हर क्लास पर ₹50 बढ़ेगा
        incentive: 15 + (cls - 6) * 2,  // ₹15 से शुरू, हर क्लास पर ₹2 बढ़ेगा
        isActive: true,
      });
    }

    for (const prog of educationPrograms) {
      const existing = await EducationProgram.findOne({ class: prog.class });
      if (!existing) {
        await EducationProgram.create(prog);
        console.log(`✅ Education program 'Class ${prog.class}' created`);
      } else {
        console.log(`⚠️ Education program 'Class ${prog.class}' already exists`);
      }
    }

    // ─── 4. Commission Splits ─────────────────────────────
    const splits = [
      { roleName: 'Level 1', percentage: 10, levelOffset: 0 },
      { roleName: 'Level 2', percentage: 5, levelOffset: 1 },
      { roleName: 'Level 3', percentage: 3, levelOffset: 2 },
      { roleName: 'Level 4', percentage: 2, levelOffset: 3 },
      { roleName: 'Level 5', percentage: 1, levelOffset: 4 },
    ];

    for (const split of splits) {
      const existing = await CommissionSplit.findOne({ roleName: split.roleName });
      if (!existing) {
        await CommissionSplit.create(split);
        console.log(`✅ Commission split '${split.roleName}' created`);
      } else {
        console.log(`⚠️ Commission split '${split.roleName}' already exists`);
      }
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log('   अब सर्वर शुरू करें और लॉगिन करें।');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();