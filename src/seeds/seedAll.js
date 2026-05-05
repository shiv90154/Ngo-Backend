// seeds/seedAll.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');                       // 🚨 was missing
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/user.model');
const LicenseType = require('../models/LicenseType');
const CommissionSplit = require('../models/CommissionSplit');
const EducationProgram = require('../models/EducationProgram');

// Verify .env was loaded
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is missing. Check your .env file.');
  process.exit(1);
}

// ───────────────────────────────────
// 1. LICENSE TYPES
// ───────────────────────────────────
const LICENSE_TYPES = [
  {
    name: 'Kishori Care License',
    code: 'KCL',
    membershipFee: 200,
    incentiveAmount: 50,
    category: 'HEALTHCARE',
    description: 'Adolescent girls welfare program – health awareness, nutrition support, and educational assistance.',
    isActive: true,
  },
  {
    name: 'Mahila Suraksha Card',
    code: 'MSC',
    membershipFee: 600,
    incentiveAmount: 150,
    category: 'SOCIAL',
    description: 'Women safety and empowerment scheme with legal aid, self‑defence training, and financial inclusion.',
    isActive: true,
  },
  {
    name: 'Urja Health Card',
    code: 'UHC',
    membershipFee: 600,
    incentiveAmount: 150,
    category: 'HEALTHCARE',
    description: 'Comprehensive health coverage including OPD, diagnostics, and discounted medicines.',
    isActive: true,
  },
  {
    name: 'Annadata Jaivik License',
    code: 'AJL',
    membershipFee: 1200,
    incentiveAmount: 300,
    category: 'AGRICULTURE',
    description: 'Organic farming support – training, soil health monitoring, and direct market linkage.',
    isActive: true,
  },
  {
    name: 'MSDR Family Samriddhi Health Card',
    code: 'MSDR',
    membershipFee: 2200,
    incentiveAmount: 600,
    category: 'HEALTHCARE',
    description: 'Family floater health card with ₹5 lakh coverage, free annual check‑up, and priority doctor consultations.',
    isActive: true,
  },
];

// ───────────────────────────────────
// 2. COMMISSION SPLITS
// ───────────────────────────────────
const COMMISSION_SPLITS = [
  { roleName: 'ADDITIONAL_DIRECTOR', percentage: 5, levelOffset: 1 },
  { roleName: 'STATE_OFFICER',       percentage: 5, levelOffset: 2 },
  { roleName: 'DISTRICT_MANAGER',    percentage: 10, levelOffset: 3 },
  { roleName: 'JILLA_BRANCH_MANAGER',percentage: 5, levelOffset: 4 },
  { roleName: 'JILLA_ADYAKSH',       percentage: 5, levelOffset: 5 },
  { roleName: 'JILLA_FIELD_OFFICER', percentage: 5, levelOffset: 6 },
  { roleName: 'BLOCK_OFFICER',       percentage: 5, levelOffset: 7 },
  { roleName: 'GRAM_BIKAS_ADHIKARI', percentage: 5, levelOffset: 8 },
  { roleName: 'NGO',                 percentage: 5, levelOffset: 9 },
  { roleName: 'CLUB',                percentage: 5, levelOffset: 10 },
];

// ───────────────────────────────────
// 3. EDUCATION PROGRAMMES (Class 6‑12)
// ───────────────────────────────────
const EDUCATION_PROGRAMS = [
  { class: 6, fee: 300, incentive: 15 },
  { class: 7, fee: 350, incentive: 20 },
  { class: 8, fee: 400, incentive: 25 },
  { class: 9, fee: 450, incentive: 25 },
  { class: 10, fee: 500, incentive: 30 },
  { class: 11, fee: 550, incentive: 30 },
  { class: 12, fee: 600, incentive: 30 },
];

// ───────────────────────────────────
// 4. SUPER ADMIN
// ───────────────────────────────────
const ADMIN_USER = {
  email: 'superadmin@samraddh.test',
  password: 'Test@1234',
  role: 'SUPER_ADMIN',
  fullName: 'Super Admin',
  phone: '1000000001',
  isVerified: true,
};

// Helper: upsert document
async function upsert(model, query, data) {
  const existing = await model.findOne(query);
  if (existing) {
    await model.updateOne(query, data);
    return 'updated';
  }
  await model.create(data);
  return 'created';
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (const lic of LICENSE_TYPES) {
      const status = await upsert(LicenseType, { code: lic.code }, lic);
      console.log(`  ${status} LicenseType: ${lic.name}`);
    }

    for (const split of COMMISSION_SPLITS) {
      const status = await upsert(CommissionSplit, { roleName: split.roleName }, split);
      console.log(`  ${status} CommissionSplit for ${split.roleName}`);
    }

    for (const prog of EDUCATION_PROGRAMS) {
      const status = await upsert(EducationProgram, { class: prog.class }, prog);
      console.log(`  ${status} EducationProgram for Class ${prog.class}`);
    }

    let admin = await User.findOne({ email: ADMIN_USER.email });
    if (!admin) {
      await User.create(ADMIN_USER);
      console.log(`  created Super Admin: ${ADMIN_USER.email}`);
    } else {
      console.log(`  Super Admin already exists: ${ADMIN_USER.email}`);
    }

    console.log('🎉 All master data seeded successfully.');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

seed();