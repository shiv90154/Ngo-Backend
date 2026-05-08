// src/seeds/createTestUsers.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// 1. Load .env from the project root (where server.js / .env usually lives)
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('✅ .env loaded from', envPath);
} else {
  console.log('⚠️  .env not found at', envPath, '- trying src/.env');
  const altPath = path.join(__dirname, '.env');
  if (fs.existsSync(altPath)) {
    require('dotenv').config({ path: altPath });
    console.log('✅ .env loaded from', altPath);
  } else {
    console.log('❌ .env file not found. Using MONGO_URI from environment.');
  }
}

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is undefined!');
  console.error('   Please set it in your .env file or environment.');
  process.exit(1);
}

const User = require('../models/user.model');

// ─── Updated users matching the final role structure ──────────────────
const USERS = [
  // Super Admin & NGO Organizational Roles
  { email: 'superadmin@samraddh.test',             role: 'SUPER_ADMIN',                   fullName: 'Super Admin',                     phone: '1000000001' },
  { email: 'additionaldirector@samraddh.test',      role: 'ADDITIONAL_DIRECTOR',            fullName: 'Additional Director',             phone: '1000000002' },
  { email: 'statedevcoordinator@samraddh.test',     role: 'STATE_DEVELOPMENT_COORDINATOR',  fullName: 'State Dev Coordinator',           phone: '1000000003' },
  { email: 'districtbranchmanager@samraddh.test',   role: 'DISTRICT_BRANCH_MANAGER',       fullName: 'District Branch Manager',         phone: '1000000004' },
  { email: 'districtpresident@samraddh.test',       role: 'DISTRICT_PRESIDENT',             fullName: 'District President',             phone: '1000000005' },
  { email: 'districtfieldcoordinator@samraddh.test',role: 'DISTRICT_FIELD_COORDINATOR',     fullName: 'District Field Coordinator',      phone: '1000000006' },
  { email: 'bamsdoctor@samraddh.test',             role: 'BAMS_DOCTOR',                    fullName: 'Dr. BAMS Doctor',                 phone: '1000000007' },
  { email: 'blockdevcoordinator@samraddh.test',     role: 'BLOCK_DEVELOPMENT_COORDINATOR',  fullName: 'Block Dev Coordinator',           phone: '1000000008' },
  { email: 'gramdevcoordinator@samraddh.test',      role: 'GRAM_DEVELOPMENT_COORDINATOR',   fullName: 'Gram Dev Coordinator',            phone: '1000000009' },

  // Sanstha Project Roles
  { email: 'itdeveloper@samraddh.test',            role: 'IT_DEVELOPER',                    fullName: 'IT Developer',                    phone: '1000000010' },
  { email: 'teacher@samraddh.test',                role: 'TEACHER',                         fullName: 'Test Teacher',                    phone: '1000000011' },
  { email: 'newseditor@samraddh.test',             role: 'NEWS_EDITOR',                     fullName: 'News Editor',                     phone: '1000000012' },
  { email: 'agriconsultancy@samraddh.test',         role: 'AGRICULTURE_CONSULTANCY',         fullName: 'Agriculture Consultancy',         phone: '1000000013' },
  { email: 'financeservice@samraddh.test',          role: 'FINANCE_SERVICE_CONSULTANCY',     fullName: 'Finance Service Consultancy',     phone: '1000000014' },
  { email: 'ngoconsultancy@samraddh.test',          role: 'NGO_CONSULTANCY',                 fullName: 'NGO Consultancy',                 phone: '1000000015' },
  { email: 'projectbased@samraddh.test',            role: 'PROJECT_BASED_INTEGRATED_ROLE',   fullName: 'Project Based Role',              phone: '1000000016' },

  // Vendor / Marketplace
  { email: 'vendor@samraddh.test',                 role: 'VENDOR',                          fullName: 'Test Vendor',                     phone: '1000000017' },
  { email: 'agent@samraddh.test',                  role: 'AGENT',                           fullName: 'Test Agent',                      phone: '1000000018' },

  // User
  { email: 'user@samraddh.test',                   role: 'USER',                            fullName: 'Normal User',                     phone: '1000000019' },
];

const PASSWORD = 'Test@1234';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const createdUsers = [];

    for (const u of USERS) {
      let user = await User.findOne({ email: u.email });
      if (user) {
        console.log(`⏭️  Already exists: ${u.email}`);
        createdUsers.push(user);
      } else {
        user = await User.create({
          ...u,
          password: PASSWORD,
          isVerified: true,
          otp: null,
          otpExpire: null,
        });
        console.log(`🆕 Created: ${u.email}`);
        createdUsers.push(user);
      }
    }

    // Hierarchy chain (for NGO organizational roles)
    const find = (email) => createdUsers.find(u => u.email === email);
    const pairs = [
      ['statedevcoordinator@samraddh.test',        'additionaldirector@samraddh.test'],
      ['districtbranchmanager@samraddh.test',      'statedevcoordinator@samraddh.test'],
      ['districtpresident@samraddh.test',          'districtbranchmanager@samraddh.test'],
      ['districtfieldcoordinator@samraddh.test',   'districtpresident@samraddh.test'],
      ['blockdevcoordinator@samraddh.test',         'districtfieldcoordinator@samraddh.test'],
      ['gramdevcoordinator@samraddh.test',          'blockdevcoordinator@samraddh.test'],
    ];

    for (const [childEmail, parentEmail] of pairs) {
      const child = find(childEmail);
      const parent = find(parentEmail);
      if (child && parent) {
        child.reportsTo = parent._id;
        await child.save();
        console.log(`🔗 ${childEmail} reports to ${parentEmail}`);
      }
    }

    console.log('🎉 All test users ready. Password for all:', PASSWORD);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

seed();