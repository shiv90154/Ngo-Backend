// backend/seeds/seedNGOClub.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://iph08_db_user:ZV88UXdyZDuQ8Xgc@cluster0.wssqmpk.mongodb.net/';

async function seedNGOClub() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected\n');

    // Check if Super Admin exists
    const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
    if (!superAdmin) {
      console.log('❌ Super Admin not found. Run seedAll.js first!');
      process.exit(1);
    }

    // Check if NGO Club already exists
    const existingNGO = await User.findOne({ role: 'NGO_CLUB' });
    if (existingNGO) {
      console.log(`⚠️  NGO Club already exists: ${existingNGO.email}`);
      console.log(`   Password: Test@123 (if not changed)`);
      process.exit(0);
    }

    // Create NGO Club user
    const ngoClub = await User.create({
      fullName: 'NGO Club',
      email: 'ngoclub@sbfngo.tech',
      phone: '9999999991',
      password: 'NGOClub@2025#Secure',
      role: 'NGO_CLUB',
      state: 'All',
      district: 'All',
      block: 'All',
      village: 'All',
      isVerified: true,
      isActive: true,
      referralCode: 'NGOCLUB01',
      sponsorId: superAdmin._id,
      reportsTo: superAdmin._id,
      hierarchyLevel: 8,
      contractStatus: 'completed',
    });

    // Update Super Admin's team size
    superAdmin.teamSize = (superAdmin.teamSize || 0) + 1;
    await superAdmin.save();

    console.log('✅ NGO Club created successfully!');
    console.log(`   📧 Email: ngoClub@sbfngo.tech`);
    console.log(`   🔑 Password: NGOClub@2025#Secure`);
    console.log(`   🆔 Referral Code: NGOCLUB01`);
    console.log(`   🎯 Role: NGO_CLUB (50% PI Share)`);
    console.log('\n🚀 Ready to use!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedNGOClub();