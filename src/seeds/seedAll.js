// backend/seeds/seedAll.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const LicenseType = require('../models/LicenseType');
const EducationProgram = require('../models/EducationProgram');
const CommissionSplit = require('../models/CommissionSplit');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://iph08_db_user:ZV88UXdyZDuQ8Xgc@cluster0.wssqmpk.mongodb.net/';

// ============================================
// HELPERS
// ============================================
const generatePhone = () => {
  const first = Math.floor(Math.random() * 4) + 6;
  let phone = first.toString();
  for (let i = 0; i < 9; i++) phone += Math.floor(Math.random() * 10).toString();
  return phone;
};

const generateReferralCode = () => {
  return 'SB' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ============================================
// MLM STRUCTURE
// ============================================
const states = [
  {
    name: 'Chhattisgarh',
    districts: [
      {
        name: 'Raipur',
        blocks: [
          { name: 'Arang', villages: ['Arang', 'Mandir Hasaud'] },
          { name: 'Tilda', villages: ['Tilda', 'Kharora'] }
        ]
      },
      {
        name: 'Bilaspur',
        blocks: [
          { name: 'Masturi', villages: ['Masturi', 'Pachpedi'] },
          { name: 'Kota', villages: ['Kota', 'Belgahna'] }
        ]
      }
    ]
  },
  {
    name: 'Madhya Pradesh',
    districts: [
      {
        name: 'Bhopal',
        blocks: [
          { name: 'Berasia', villages: ['Berasia', 'Nazeerabad'] },
          { name: 'Huzur', villages: ['Huzur', 'Misrod'] }
        ]
      },
      {
        name: 'Indore',
        blocks: [
          { name: 'Sanwer', villages: ['Sanwer', 'Simrol'] },
          { name: 'Mhow', villages: ['Mhow', 'Manpur'] }
        ]
      }
    ]
  },
  {
    name: 'Maharashtra',
    districts: [
      {
        name: 'Nagpur',
        blocks: [
          { name: 'Hingna', villages: ['Hingna', 'Wanadongri'] },
          { name: 'Kamptee', villages: ['Kamptee', 'Koradi'] }
        ]
      },
      {
        name: 'Pune',
        blocks: [
          { name: 'Haveli', villages: ['Haveli', 'Wagholi'] },
          { name: 'Purandar', villages: ['Purandar', 'Saswad'] }
        ]
      }
    ]
  }
];

// ============================================
// COMMISSION SPLITS
// ============================================
const commissionSplits = [
  { roleName: 'Level 1 - All', percentage: 10, levelOffset: 0, productType: 'all' },
  { roleName: 'Level 2 - All', percentage: 5, levelOffset: 1, productType: 'all' },
  { roleName: 'Level 3 - All', percentage: 3, levelOffset: 2, productType: 'all' },
  { roleName: 'Level 4 - All', percentage: 2, levelOffset: 3, productType: 'all' },
  { roleName: 'Level 5 - All', percentage: 1, levelOffset: 4, productType: 'all' },
  { roleName: 'Level 1 - License', percentage: 12, levelOffset: 0, productType: 'license' },
  { roleName: 'Level 2 - License', percentage: 6, levelOffset: 1, productType: 'license' },
  { roleName: 'Level 3 - License', percentage: 4, levelOffset: 2, productType: 'license' },
  { roleName: 'Level 4 - License', percentage: 3, levelOffset: 3, productType: 'license' },
  { roleName: 'Level 5 - License', percentage: 2, levelOffset: 4, productType: 'license' },
  { roleName: 'Level 1 - Education', percentage: 8, levelOffset: 0, productType: 'education' },
  { roleName: 'Level 2 - Education', percentage: 4, levelOffset: 1, productType: 'education' },
  { roleName: 'Level 3 - Education', percentage: 2, levelOffset: 2, productType: 'education' },
  { roleName: 'Level 4 - Education', percentage: 1, levelOffset: 3, productType: 'education' },
  { roleName: 'Level 5 - Education', percentage: 1, levelOffset: 4, productType: 'education' },
];

// ============================================
// LICENSE TYPES
// ============================================
const licenseTypes = [
  { name: 'Kishori Care', code: 'KC001', membershipFee: 500, incentiveAmount: 50, description: 'Adolescent girls welfare program' },
  { name: 'Mahila Suraksha', code: 'MS002', membershipFee: 1000, incentiveAmount: 100, description: 'Women safety and empowerment scheme' },
  { name: 'Urja Health', code: 'UH003', membershipFee: 1500, incentiveAmount: 150, description: 'Comprehensive health coverage' },
  { name: 'Annadata Jaivik', code: 'AJ004', membershipFee: 800, incentiveAmount: 80, description: 'Organic farming support program' },
  { name: 'MSDR Family Health', code: 'MFH005', membershipFee: 2000, incentiveAmount: 200, description: 'Family floater health card' },
];

// ============================================
// EDUCATION PROGRAMS
// ============================================
const educationPrograms = [];
for (let cls = 6; cls <= 12; cls++) {
  educationPrograms.push({
    class: cls,
    fee: 300 + (cls - 6) * 50,
    incentive: 15 + (cls - 6) * 2,
    isActive: true,
  });
}

// ============================================
// MAIN SEED FUNCTION
// ============================================
async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected\n');

    // Clear existing data
    await User.deleteMany({});
    await LicenseType.deleteMany({});
    await EducationProgram.deleteMany({});
    await CommissionSplit.deleteMany({});
    console.log('🗑️  Old data cleared\n');

    // 1. SUPER ADMIN
    const superAdmin = await User.create({
      fullName: 'Super Admin',
      email: 'iph08@inphora.in',
      phone: '7004674232',
      password: 'Admin@2025#Secure',
      role: 'SUPER_ADMIN',
      isVerified: true,
      isActive: true,
      referralCode: 'SUPER01',
      state: 'All',
      district: 'All',
      block: 'HQ',
      village: 'HQ',
      contractStatus: 'completed',
    });
    console.log(`✅ Super Admin: ${superAdmin.email} | Ref: SUPER01\n`);

    // 2. MLM STRUCTURE
    for (const state of states) {
      console.log(`📌 ${state.name}`);

      const ad = await User.create({
        fullName: `AD ${state.name}`,
        email: `ad.${state.name.toLowerCase().replace(/\s+/g, '')}@sbfngo.tech`,
        phone: generatePhone(),
        password: 'Test@123',
        role: 'ADDITIONAL_DIRECTOR',
        state: state.name,
        isVerified: true, isActive: true,
        referralCode: generateReferralCode(),
        sponsorId: superAdmin._id,
        reportsTo: superAdmin._id,
        hierarchyLevel: 1,
      });
      superAdmin.teamSize += 1;
      console.log(`  AD: ${ad.fullName} (${ad.referralCode})`);

      const sc = await User.create({
        fullName: `SC ${state.name}`,
        email: `sc.${state.name.toLowerCase().replace(/\s+/g, '')}@sbfngo.tech`,
        phone: generatePhone(),
        password: 'Test@123',
        role: 'STATE_DEVELOPMENT_COORDINATOR',
        state: state.name,
        isVerified: true, isActive: true,
        referralCode: generateReferralCode(),
        sponsorId: ad._id, reportsTo: ad._id,
        hierarchyLevel: 2,
      });
      ad.teamSize += 1;
      console.log(`  SC: ${sc.fullName} (${sc.referralCode})`);

      for (const dist of state.districts) {
        const dm = await User.create({
          fullName: `DM ${dist.name}`,
          email: `dm.${dist.name.toLowerCase().replace(/\s+/g, '')}@sbfngo.tech`,
          phone: generatePhone(),
          password: 'Test@123',
          role: 'DISTRICT_BRANCH_MANAGER',
          state: state.name, district: dist.name,
          isVerified: true, isActive: true,
          referralCode: generateReferralCode(),
          sponsorId: sc._id, reportsTo: sc._id,
          hierarchyLevel: 3,
        });
        sc.teamSize += 1;

        const dp = await User.create({
          fullName: `DP ${dist.name}`,
          email: `dp.${dist.name.toLowerCase().replace(/\s+/g, '')}@sbfngo.tech`,
          phone: generatePhone(),
          password: 'Test@123',
          role: 'DISTRICT_PRESIDENT',
          state: state.name, district: dist.name,
          isVerified: true, isActive: true,
          referralCode: generateReferralCode(),
          sponsorId: dm._id, reportsTo: dm._id,
          hierarchyLevel: 4,
        });
        dm.teamSize += 1;

        const fc = await User.create({
          fullName: `FC ${dist.name}`,
          email: `fc.${dist.name.toLowerCase().replace(/\s+/g, '')}@sbfngo.tech`,
          phone: generatePhone(),
          password: 'Test@123',
          role: 'DISTRICT_FIELD_COORDINATOR',
          state: state.name, district: dist.name,
          isVerified: true, isActive: true,
          referralCode: generateReferralCode(),
          sponsorId: dm._id, reportsTo: dm._id,
          hierarchyLevel: 4,
        });
        dm.teamSize += 1;

        for (const block of dist.blocks) {
          const bc = await User.create({
            fullName: `BC ${block.name}`,
            email: `bc.${block.name.toLowerCase().replace(/\s+/g, '')}@sbfngo.tech`,
            phone: generatePhone(),
            password: 'Test@123',
            role: 'BLOCK_DEVELOPMENT_COORDINATOR',
            state: state.name, district: dist.name, block: block.name,
            isVerified: true, isActive: true,
            referralCode: generateReferralCode(),
            sponsorId: fc._id, reportsTo: fc._id,
            hierarchyLevel: 5,
          });
          fc.teamSize += 1;

          for (const village of block.villages) {
            const gc = await User.create({
              fullName: `GC ${village}`,
              email: `gc.${village.toLowerCase().replace(/\s+/g, '')}@sbfngo.tech`,
              phone: generatePhone(),
              password: 'Test@123',
              role: 'GRAM_DEVELOPMENT_COORDINATOR',
              state: state.name, district: dist.name, block: block.name, village: village,
              isVerified: true, isActive: true,
              referralCode: generateReferralCode(),
              sponsorId: bc._id, reportsTo: bc._id,
              hierarchyLevel: 6,
            });
            bc.teamSize += 1;

            for (let i = 1; i <= 2; i++) {
              const user = await User.create({
                fullName: `User ${village} ${i}`,
                email: `user.${village.toLowerCase().replace(/\s+/g, '')}${i}@sbfngo.tech`,
                phone: generatePhone(),
                password: 'Test@123',
                role: 'USER',
                state: state.name, district: dist.name, block: block.name, village: village,
                isVerified: true, isActive: true,
                referralCode: generateReferralCode(),
                sponsorId: gc._id, reportsTo: gc._id,
                hierarchyLevel: 7,
              });
              gc.teamSize += 1;
            }
          }
        }
      }
      await superAdmin.save();
      await ad.save();
      await sc.save();
    }

    // 3. LICENSE TYPES
    console.log('\n📌 Licenses');
    for (const l of licenseTypes) {
      await LicenseType.create(l);
      console.log(`  ✅ ${l.name}`);
    }

    // 4. EDUCATION
    console.log('\n📌 Education');
    for (const p of educationPrograms) {
      await EducationProgram.create(p);
      console.log(`  ✅ Class ${p.class} | ₹${p.fee} | ₹${p.incentive}`);
    }

    // 5. COMMISSION SPLITS
    console.log('\n📌 Splits');
    for (const s of commissionSplits) {
      await CommissionSplit.create(s);
      console.log(`  ✅ ${s.roleName} (${s.productType}) ${s.percentage}%`);
    }

    // SUMMARY
    console.log('\n🎉 DONE');
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Licenses: ${await LicenseType.countDocuments()}`);
    console.log(`   Programs: ${await EducationProgram.countDocuments()}`);
    console.log(`   Splits: ${await CommissionSplit.countDocuments()}`);
    console.log('\n🔑 Super Admin: iph08@inphora.in / Admin@2025#Secure');
    console.log('🔑 Others: Test@123');

    process.exit(0);
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}

seed();