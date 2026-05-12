// backend/seeds/seedAdmin.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const User = require('../models/user.model');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is missing. Check your .env file.');
  process.exit(1);
}

async function seedAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');

    // पुराना Super Admin हटाओ (अगर है तो)
    await User.deleteMany({ role: 'SUPER_ADMIN' });
    console.log('🗑️ Old Super Admin removed (if any).');

    const hashedPassword = await bcrypt.hash('Test@1234', 10);
    const admin = await User.create({
      fullName: 'Super Admin',
      email: 'superadmin@samraddh.test',
      phone: '9999999999',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      state: 'Delhi',
      district: 'Central Delhi',
      isVerified: true,
      isActive: true,
      referralCode: 'SUPER1',
    });

    console.log(`👤 Super Admin created: ${admin.email} / Test@1234`);
    console.log(`🔢 Referral Code: ${admin.referralCode}`);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

seedAdmin();