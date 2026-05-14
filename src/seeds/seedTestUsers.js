// backend/seeds/seedTestUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/samridh_bharat';

const generatePhone = () => {
  const first = Math.floor(Math.random() * 4) + 6;
  let phone = first.toString();
  for (let i = 0; i < 9; i++) phone += Math.floor(Math.random() * 10).toString();
  return phone;
};

const generateReferralCode = () => {
  return 'SB' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

async function seedTestUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected\n');

    // Find Super Admin for sponsor
    const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
    if (!superAdmin) {
      console.log('❌ Super Admin not found. Run seedAll.js first!');
      process.exit(1);
    }

    const testUsers = [];

    // ============================================
    // 1. STATE COORDINATOR (Chhattisgarh)
    // ============================================
    const stateCoordinator = await User.create({
      fullName: 'Ravi Sharma (State Coordinator CG)',
      email: 'ravi.state.cg@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'STATE_DEVELOPMENT_COORDINATOR',
      state: 'Chhattisgarh',
      district: 'Raipur',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: superAdmin._id,
      reportsTo: superAdmin._id,
      hierarchyLevel: 2,
    });
    testUsers.push(stateCoordinator);
    console.log(`✅ State Coordinator: ${stateCoordinator.email} | Pass: Test@123`);

    // ============================================
    // 2. DISTRICT MANAGER (Raipur)
    // ============================================
    const districtManager = await User.create({
      fullName: 'Amit Verma (DM Raipur)',
      email: 'amit.dm.raipur@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'DISTRICT_BRANCH_MANAGER',
      state: 'Chhattisgarh',
      district: 'Raipur',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: stateCoordinator._id,
      reportsTo: stateCoordinator._id,
      hierarchyLevel: 3,
    });
    testUsers.push(districtManager);
    console.log(`✅ District Manager: ${districtManager.email} | Pass: Test@123`);

    // ============================================
    // 3. DISTRICT PRESIDENT (Raipur)
    // ============================================
    const districtPresident = await User.create({
      fullName: 'Sunita Devi (DP Raipur)',
      email: 'sunita.dp.raipur@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'DISTRICT_PRESIDENT',
      state: 'Chhattisgarh',
      district: 'Raipur',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: districtManager._id,
      reportsTo: districtManager._id,
      hierarchyLevel: 4,
    });
    testUsers.push(districtPresident);
    console.log(`✅ District President: ${districtPresident.email} | Pass: Test@123`);

    // ============================================
    // 4. FIELD COORDINATOR (Raipur)
    // ============================================
    const fieldCoordinator = await User.create({
      fullName: 'Rajesh Kumar (FC Raipur)',
      email: 'rajesh.fc.raipur@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'DISTRICT_FIELD_COORDINATOR',
      state: 'Chhattisgarh',
      district: 'Raipur',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: districtManager._id,
      reportsTo: districtManager._id,
      hierarchyLevel: 4,
    });
    testUsers.push(fieldCoordinator);
    console.log(`✅ Field Coordinator: ${fieldCoordinator.email} | Pass: Test@123`);

    // ============================================
    // 5. BLOCK COORDINATOR (Arang, Raipur)
    // ============================================
    const blockCoordinator = await User.create({
      fullName: 'Priya Singh (BC Arang)',
      email: 'priya.bc.arang@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'BLOCK_DEVELOPMENT_COORDINATOR',
      state: 'Chhattisgarh',
      district: 'Raipur',
      block: 'Arang',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: fieldCoordinator._id,
      reportsTo: fieldCoordinator._id,
      hierarchyLevel: 5,
    });
    testUsers.push(blockCoordinator);
    console.log(`✅ Block Coordinator: ${blockCoordinator.email} | Pass: Test@123`);

    // ============================================
    // 6. GRAM COORDINATOR (Arang village)
    // ============================================
    const gramCoordinator = await User.create({
      fullName: 'Mohan Patel (GC Arang)',
      email: 'mohan.gc.arang@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'GRAM_DEVELOPMENT_COORDINATOR',
      state: 'Chhattisgarh',
      district: 'Raipur',
      block: 'Arang',
      village: 'Arang',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: blockCoordinator._id,
      reportsTo: blockCoordinator._id,
      hierarchyLevel: 6,
    });
    testUsers.push(gramCoordinator);
    console.log(`✅ Gram Coordinator: ${gramCoordinator.email} | Pass: Test@123`);

    // ============================================
    // 7. NORMAL USERS (Under Gram Coordinator)
    // ============================================
    const user1 = await User.create({
      fullName: 'Sita Bai (User Arang 1)',
      email: 'sita.user.arang@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'USER',
      state: 'Chhattisgarh',
      district: 'Raipur',
      block: 'Arang',
      village: 'Arang',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: gramCoordinator._id,
      reportsTo: gramCoordinator._id,
      hierarchyLevel: 7,
    });
    testUsers.push(user1);
    console.log(`✅ User: ${user1.email} | Pass: Test@123`);

    const user2 = await User.create({
      fullName: 'Gita Verma (User Arang 2)',
      email: 'gita.user.arang@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'USER',
      state: 'Chhattisgarh',
      district: 'Raipur',
      block: 'Arang',
      village: 'Arang',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: gramCoordinator._id,
      reportsTo: gramCoordinator._id,
      hierarchyLevel: 7,
    });
    testUsers.push(user2);
    console.log(`✅ User: ${user2.email} | Pass: Test@123`);

    // ============================================
    // 8. TEACHER
    // ============================================
    const teacher = await User.create({
      fullName: 'Dr. Meena Sharma (Teacher)',
      email: 'meena.teacher@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'TEACHER',
      state: 'Chhattisgarh',
      district: 'Raipur',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: superAdmin._id,
      reportsTo: superAdmin._id,
      hierarchyLevel: 10,
      teacherProfile: {
        specialization: 'Mathematics',
        qualifications: ['B.Ed', 'M.Sc'],
        experienceYears: 5,
        earnings: 0,
      },
    });
    testUsers.push(teacher);
    console.log(`✅ Teacher: ${teacher.email} | Pass: Test@123`);

    // ============================================
    // 9. BAMS DOCTOR
    // ============================================
    const doctor = await User.create({
      fullName: 'Dr. Anand Tiwari (BAMS)',
      email: 'anand.doctor@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'BAMS_DOCTOR',
      state: 'Chhattisgarh',
      district: 'Raipur',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: superAdmin._id,
      reportsTo: superAdmin._id,
      hierarchyLevel: 5,
      doctorProfile: {
        specialization: 'Ayurveda',
        experienceYears: 8,
        consultationFee: 200,
        registrationNumber: 'BAMS12345',
      },
    });
    testUsers.push(doctor);
    console.log(`✅ Doctor: ${doctor.email} | Pass: Test@123`);

    // ============================================
    // 10. VENDOR
    // ============================================
    const vendor = await User.create({
      fullName: 'Ramesh Kumar (Vendor)',
      email: 'ramesh.vendor@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'VENDOR',
      state: 'Chhattisgarh',
      district: 'Raipur',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: superAdmin._id,
      reportsTo: superAdmin._id,
      hierarchyLevel: 11,
      sellerProfile: {
        isSeller: true,
        storeName: 'Ramesh General Store',
        gstNumber: '22AAAAA0000A1Z5',
        rating: 4.5,
      },
    });
    testUsers.push(vendor);
    console.log(`✅ Vendor: ${vendor.email} | Pass: Test@123`);

    // ============================================
    // 11. AGENT
    // ============================================
    const agent = await User.create({
      fullName: 'Suresh Agent',
      email: 'suresh.agent@sbfngo.tech',
      phone: generatePhone(),
      password: 'Test@123',
      role: 'AGENT',
      state: 'Chhattisgarh',
      district: 'Raipur',
      isVerified: true,
      isActive: true,
      referralCode: generateReferralCode(),
      sponsorId: superAdmin._id,
      reportsTo: superAdmin._id,
      hierarchyLevel: 11,
    });
    testUsers.push(agent);
    console.log(`✅ Agent: ${agent.email} | Pass: Test@123`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n🎉 ================================');
    console.log('🎉    TEST USERS CREATED!');
    console.log('🎉 ================================');
    console.log(`\n📊 Total test users created: ${testUsers.length}`);
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log('   All test users password: Test@123');
    console.log('\n📧 Test Emails:');
    testUsers.forEach(u => console.log(`   ${u.email} (${u.role})`));
    console.log('\n✅ Ready to test! Start the server and login.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedTestUsers();