// src/seeds/createTestUsers.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// 1. Load .env from the EXACT location (src/.env)
const envPath = path.join(__dirname, '..', '.env');
console.log('🔍 Looking for .env at:', envPath);

if (fs.existsSync(envPath)) {
  console.log('✅ .env file found, loading...');
  require('dotenv').config({ path: envPath });
} else {
  console.log('❌ .env file NOT found at', envPath);
  console.log('   Make sure your .env is in the src/ folder');
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is still undefined after loading .env!');
  console.error('   Please check your .env file:');
  console.error('   - No spaces around = sign');
  console.error('   - No quotes around the value');
  console.error('   - It starts exactly with MONGO_URI=');
  console.error('');
  console.error('   You can also edit this script and set MONGO_URI manually.');
  process.exit(1);
}

const User = require('../models/user.model');

const USERS = [
  { email: 'superadmin@samraddh.test',         role: 'SUPER_ADMIN',           fullName: 'Super Admin',             phone: '1000000001' },
  { email: 'additionaldirector@samraddh.test',  role: 'ADDITIONAL_DIRECTOR',   fullName: 'Additional Director',      phone: '1000000002' },
  { email: 'stateofficer@samraddh.test',        role: 'STATE_OFFICER',         fullName: 'State Officer',            phone: '1000000003' },
  { email: 'districtmanager@samraddh.test',     role: 'DISTRICT_MANAGER',      fullName: 'District Manager',         phone: '1000000004' },
  { email: 'districtpresident@samraddh.test',   role: 'DISTRICT_PRESIDENT',    fullName: 'District President',       phone: '1000000005' },
  { email: 'fieldofficer@samraddh.test',        role: 'FIELD_OFFICER',         fullName: 'Field Officer',            phone: '1000000006' },
  { email: 'jillabranchmanager@samraddh.test',  role: 'JILLA_BRANCH_MANAGER',  fullName: 'Jilla Branch Manager',     phone: '1000000007' },
  { email: 'jillaadyaksh@samraddh.test',        role: 'JILLA_ADYAKSH',         fullName: 'Jilla Adyaksh',            phone: '1000000008' },
  { email: 'jillafieldofficer@samraddh.test',   role: 'JILLA_FIELD_OFFICER',   fullName: 'Jilla Field Officer',      phone: '1000000009' },
  { email: 'blockofficer@samraddh.test',        role: 'BLOCK_OFFICER',         fullName: 'Block Officer',            phone: '1000000010' },
  { email: 'villageofficer@samraddh.test',      role: 'VILLAGE_OFFICER',       fullName: 'Village Officer',          phone: '1000000011' },
  { email: 'gramvikas@samraddh.test',           role: 'GRAM_BIKAS_ADHIKARI',   fullName: 'Gram Vikas Adhikari',      phone: '1000000012' },
  { email: 'doctor@samraddh.test',              role: 'DOCTOR',                fullName: 'Dr. Test Doctor',          phone: '1000000013' },
  { email: 'teacher@samraddh.test',             role: 'TEACHER',               fullName: 'Test Teacher',             phone: '1000000014' },
  { email: 'agent@samraddh.test',               role: 'AGENT',                 fullName: 'Test Agent',               phone: '1000000015' },
  { email: 'ngo@samraddh.test',                 role: 'NGO',                   fullName: 'NGO Representative',       phone: '1000000016' },
  { email: 'club@samraddh.test',                role: 'CLUB',                  fullName: 'Club Representative',      phone: '1000000017' },
  { email: 'user@samraddh.test',                role: 'USER',                  fullName: 'Normal User',              phone: '1000000018' },
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

    // Hierarchy chain
    const find = (email) => createdUsers.find(u => u.email === email);
    const pairs = [
      ['additionaldirector@samraddh.test',   'superadmin@samraddh.test'],
      ['stateofficer@samraddh.test',         'additionaldirector@samraddh.test'],
      ['districtmanager@samraddh.test',      'stateofficer@samraddh.test'],
      ['jillabranchmanager@samraddh.test',   'districtmanager@samraddh.test'],
      ['jillaadyaksh@samraddh.test',         'jillabranchmanager@samraddh.test'],
      ['jillafieldofficer@samraddh.test',    'jillaadyaksh@samraddh.test'],
      ['blockofficer@samraddh.test',         'jillafieldofficer@samraddh.test'],
      ['gramvikas@samraddh.test',            'blockofficer@samraddh.test'],
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