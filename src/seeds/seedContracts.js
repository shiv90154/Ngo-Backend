const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');

// Models
const User = require('../models/user.model');
const LicenseType = require('../models/LicenseType');
const CommissionSplit = require('../models/CommissionSplit');
const EducationProgram = require('../models/EducationProgram');
const ProductSale = require('../models/ProductSale');
const Donation = require('../models/Donation');
const Beneficiary = require('../models/Beneficiary');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const Expense = require('../models/Expense');
const CommissionTransaction = require('../models/CommissionTransaction');
const Contract = require('../models/Contract');
const { calculateCommission } = require('../services/mlmEngine');

const MONGO_URI= process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is missing. Check your .env file.');
  process.exit(1);
}

const hashPassword = async (pwd) => await bcrypt.hash(pwd, 10);

// ---------- LICENSE TYPES ----------
const LICENSE_TYPES = [
  { name: 'Kishori Care License', code: 'KCL', membershipFee: 200, incentiveAmount: 50, category: 'HEALTHCARE', description: 'किशोरी बालिका कल्याण' },
  { name: 'Mahila Suraksha Card', code: 'MSC', membershipFee: 600, incentiveAmount: 150, category: 'SOCIAL', description: 'महिला सुरक्षा योजना' },
  { name: 'Urja Health Card', code: 'UHC', membershipFee: 600, incentiveAmount: 150, category: 'HEALTHCARE', description: 'स्वास्थ्य कवर' },
  { name: 'Annadata Jaivik License', code: 'AJL', membershipFee: 1200, incentiveAmount: 300, category: 'AGRICULTURE', description: 'जैविक खेती' },
  { name: 'MSDR Family Samriddhi Card', code: 'MSDR', membershipFee: 2200, incentiveAmount: 600, category: 'HEALTHCARE', description: 'परिवार स्वास्थ्य कार्ड' },
];

// ---------- COMMISSION SPLITS ----------
const COMMISSION_SPLITS = [
  { roleName: 'Level 1', percentage: 10, levelOffset: 1 },
  { roleName: 'Level 2', percentage: 5, levelOffset: 2 },
  { roleName: 'Level 3', percentage: 3, levelOffset: 3 },
  { roleName: 'Level 4', percentage: 2, levelOffset: 4 },
  { roleName: 'Level 5', percentage: 1, levelOffset: 5 },
];

// ---------- EDUCATION PROGRAMS ----------
const EDUCATION_PROGRAMS = [
  { class: 6, fee: 300, incentive: 15 },
  { class: 7, fee: 350, incentive: 20 },
  { class: 8, fee: 400, incentive: 25 },
  { class: 9, fee: 450, incentive: 25 },
  { class: 10, fee: 500, incentive: 30 },
  { class: 11, fee: 550, incentive: 30 },
  { class: 12, fee: 600, incentive: 30 },
];

// ---------- USERS (टेस्ट नेटवर्क) ----------
const USERS = [
  { fullName: 'Super Admin', email: 'superadmin@samraddh.test', phone: '1000000001', role: 'SUPER_ADMIN', password: 'Test@1234', state: 'Delhi', district: 'Central Delhi' },
  { fullName: 'Additional Director', email: 'director@samraddh.test', phone: '1000000002', role: 'ADDITIONAL_DIRECTOR', password: 'Test@1234', sponsorIdx: 0, state: 'Uttar Pradesh', district: 'Lucknow' },
  { fullName: 'UP Coordinator', email: 'up.coordinator@samraddh.test', phone: '1000000003', role: 'STATE_DEVELOPMENT_COORDINATOR', password: 'Test@1234', sponsorIdx: 1, state: 'Uttar Pradesh', district: 'Lucknow' },
  { fullName: 'Lucknow Manager', email: 'lucknow.manager@samraddh.test', phone: '1000000004', role: 'DISTRICT_BRANCH_MANAGER', password: 'Test@1234', sponsorIdx: 2, state: 'Uttar Pradesh', district: 'Lucknow' },
  { fullName: 'Kanpur President', email: 'kanpur.president@samraddh.test', phone: '1000000005', role: 'DISTRICT_PRESIDENT', password: 'Test@1234', sponsorIdx: 2, state: 'Uttar Pradesh', district: 'Kanpur' },
  { fullName: 'Varanasi Field Coordinator', email: 'varanasi.field@samraddh.test', phone: '1000000006', role: 'DISTRICT_FIELD_COORDINATOR', password: 'Test@1234', sponsorIdx: 2, state: 'Uttar Pradesh', district: 'Varanasi' },
  { fullName: 'Allahabad Doctor', email: 'allahabad.doctor@samraddh.test', phone: '1000000007', role: 'BAMS_DOCTOR', password: 'Test@1234', sponsorIdx: 3, state: 'Uttar Pradesh', district: 'Allahabad' },
  { fullName: 'Block Coordinator BKT', email: 'bkt.block@samraddh.test', phone: '1000000008', role: 'BLOCK_DEVELOPMENT_COORDINATOR', password: 'Test@1234', sponsorIdx: 3, state: 'Uttar Pradesh', district: 'Lucknow', block: 'Bakshi Ka Talab' },
  { fullName: 'Gram Coordinator A', email: 'gram.a@samraddh.test', phone: '1000000009', role: 'GRAM_DEVELOPMENT_COORDINATOR', password: 'Test@1234', sponsorIdx: 7, state: 'Uttar Pradesh', district: 'Lucknow', block: 'Bakshi Ka Talab', village: 'Kakori' },
  { fullName: 'Rajesh Kumar', email: 'rajesh@test.com', phone: '1000000010', role: 'USER', password: 'Test@1234', sponsorIdx: 8, state: 'Uttar Pradesh', district: 'Lucknow', block: 'Bakshi Ka Talab', village: 'Kakori' },
  { fullName: 'Sunita Devi', email: 'sunita@test.com', phone: '1000000011', role: 'USER', password: 'Test@1234', sponsorIdx: 8, state: 'Uttar Pradesh', district: 'Lucknow', block: 'Bakshi Ka Talab', village: 'Kakori' },
  { fullName: 'Vendor Ji', email: 'vendor@samraddh.test', phone: '1000000012', role: 'VENDOR', password: 'Test@1234', sponsorIdx: 4, state: 'Uttar Pradesh', district: 'Kanpur' },
  { fullName: 'Agent Ji', email: 'agent@samraddh.test', phone: '1000000013', role: 'AGENT', password: 'Test@1234', sponsorIdx: 4, state: 'Uttar Pradesh', district: 'Kanpur' },
  // Additional roles (Sanstha Project)
  { fullName: 'IT Dev', email: 'it.dev@samraddh.test', phone: '1000000014', role: 'IT_DEVELOPER', password: 'Test@1234', sponsorIdx: 9, state: 'Uttar Pradesh', district: 'Lucknow' },
  { fullName: 'Teacher Ji', email: 'teacher@samraddh.test', phone: '1000000015', role: 'TEACHER', password: 'Test@1234', sponsorIdx: 9, state: 'Uttar Pradesh', district: 'Lucknow' },
  { fullName: 'News Editor', email: 'news.editor@samraddh.test', phone: '1000000016', role: 'NEWS_EDITOR', password: 'Test@1234', sponsorIdx: 9, state: 'Uttar Pradesh', district: 'Lucknow' },
  { fullName: 'Agriculture Consult', email: 'agri.consult@samraddh.test', phone: '1000000017', role: 'AGRICULTURE_CONSULTANCY', password: 'Test@1234', sponsorIdx: 9, state: 'Uttar Pradesh', district: 'Lucknow' },
  { fullName: 'Finance Consult', email: 'fin.consult@samraddh.test', phone: '1000000018', role: 'FINANCE_SERVICE_CONSULTANCY', password: 'Test@1234', sponsorIdx: 9, state: 'Uttar Pradesh', district: 'Lucknow' },
  { fullName: 'NGO Consult', email: 'ngo.consult@samraddh.test', phone: '1000000019', role: 'NGO_CONSULTANCY', password: 'Test@1234', sponsorIdx: 9, state: 'Uttar Pradesh', district: 'Lucknow' },
  { fullName: 'Project Based', email: 'project@samraddh.test', phone: '1000000020', role: 'PROJECT_BASED_INTEGRATED_ROLE', password: 'Test@1234', sponsorIdx: 9, state: 'Uttar Pradesh', district: 'Lucknow' },
];

// ---------- CONTRACTS (तीनों भेजे गए रोल के लिए असली, बाकी के लिए डिफ़ॉल्ट) ----------
const CONTRACTS = [
  {
    role: 'ADDITIONAL_DIRECTOR',
    title: 'सेवा अनुबंध – अतिरिक्त निदेशक (राज्य प्रमुख)',
    content: `"यहाँ असली कॉन्ट्रैक्ट टेक्स्ट डालें – Additional Director का पूरा"`,
    terms: ['राज्य में न्यूनतम 5 जिला इकाइयों का गठन', 'प्रति माह 50 लाइसेंस बिक्री', 'राज्य स्तरीय समीक्षा', 'वित्तीय अनुशासन', 'डेटा सुरक्षा'],
    requiredFields: ['processingFee', 'securityDeposit'],
  },
  {
    role: 'STATE_DEVELOPMENT_COORDINATOR',
    title: 'सेवा अनुबंध – राज्य विकास समन्वयक (SDC)',
    content: `"यहाँ असली कॉन्ट्रैक्ट टेक्स्ट डालें – SDC का पूरा"`,
    terms: ['5 जिलों का प्रबंधन', 'मासिक रिपोर्टिंग', 'धन संग्रह पर प्रतिबंध', 'गोपनीयता'],
    requiredFields: ['processingFee', 'securityDeposit'],
  },
  {
    role: 'BLOCK_DEVELOPMENT_COORDINATOR',
    title: 'सेवा अनुबंध – ब्लॉक समन्वयक / कार्यक्रम अधिकारी',
    content: `"यहाँ असली कॉन्ट्रैक्ट टेक्स्ट डालें – Block Coordinator का पूरा"`,
    terms: ['ब्लॉक स्तर पर टीम गठन', 'सदस्य पंजीकरण', 'साप्ताहिक रिपोर्टिंग', 'अनुशासन नीति'],
    requiredFields: ['processingFee'],
  },
];

// बाकी सभी रोल के लिए एक default contract
const DEFAULT_CONTRACT = {
  title: 'सेवा अनुबंध (सामान्य)',
  content: '<p>यह अनुबंध संस्था और {role} के बीच हुआ है। सभी सामान्य शर्तें लागू हैं।</p>',
  terms: ['संस्था के नियमों का पालन', 'गोपनीयता बनाए रखना'],
  requiredFields: [],
};

async function seedFull() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');

    // Clear all collections
    await Promise.all([
      User.deleteMany({}), LicenseType.deleteMany({}), CommissionSplit.deleteMany({}),
      EducationProgram.deleteMany({}), ProductSale.deleteMany({}), Donation.deleteMany({}),
      Beneficiary.deleteMany({}), Campaign.deleteMany({}), Event.deleteMany({}),
      Expense.deleteMany({}), CommissionTransaction.deleteMany({}), Contract.deleteMany({}),
    ]);
    console.log('🗑️ Old data cleared');

    // Insert master data
    const licenses = await LicenseType.insertMany(LICENSE_TYPES);
    const splits = await CommissionSplit.insertMany(COMMISSION_SPLITS);
    const eduPrograms = await EducationProgram.insertMany(EDUCATION_PROGRAMS);
    console.log('📊 Master data inserted');

    // Create users (resolve sponsor references)
    const createdUsers = [];
    for (const u of USERS) {
      const hashedPwd = await hashPassword(u.password);
      const userObj = {
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        password: hashedPwd,
        role: u.role,
        state: u.state || '',
        district: u.district || '',
        block: u.block || '',
        village: u.village || '',
        isVerified: true,
        isActive: true,
        sponsorId: u.sponsorIdx !== undefined && u.sponsorIdx < createdUsers.length ? createdUsers[u.sponsorIdx]._id : null,
      };
      const user = await User.create(userObj);
      createdUsers.push(user);
    }
    console.log('👥 Users created');

    // Update binary tree (left/right child) and team size
    for (const user of createdUsers) {
      if (user.sponsorId) {
        const sponsor = await User.findById(user.sponsorId);
        if (sponsor) {
          sponsor.teamSize = (sponsor.teamSize || 0) + 1;
          if (!sponsor.leftChild) {
            sponsor.leftChild = user._id;
          } else if (!sponsor.rightChild) {
            sponsor.rightChild = user._id;
          }
          await sponsor.save();
        }
      }
    }
    console.log('🌳 Binary tree updated');

    // Seed contracts – first the three specific ones, then all remaining roles with default
    const rolesWithContract = new Set(CONTRACTS.map(c => c.role));
    // Insert/update specific contracts
    for (const c of CONTRACTS) {
      await Contract.findOneAndUpdate(
        { role: c.role },
        { ...c, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }
    // Insert default contracts for all roles that are not already covered
    const allRoles = [...new Set(USERS.map(u => u.role))]; // unique roles from users
    for (const role of allRoles) {
      if (!rolesWithContract.has(role)) {
        await Contract.findOneAndUpdate(
          { role },
          {
            role,
            title: DEFAULT_CONTRACT.title,
            content: DEFAULT_CONTRACT.content.replace('{role}', role),
            terms: DEFAULT_CONTRACT.terms,
            requiredFields: DEFAULT_CONTRACT.requiredFields,
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log('📄 Contracts seeded');

    // === SALES DEMO ===
    const gramCoord = createdUsers[8];   // Gram Coordinator A
    const rajesh = createdUsers[9];
    const sunita = createdUsers[10];
    const kanpurPres = createdUsers[4];
    const agent = createdUsers[12];

    // Sale 1: License (KCL) to Rajesh
    const sale1 = await ProductSale.create({
      productType: 'license',
      licenseType: licenses[0]._id,
      customerName: rajesh.fullName,
      customer: rajesh._id,
      soldBy: gramCoord._id,
      amount: licenses[0].membershipFee,
    });
    await User.findByIdAndUpdate(gramCoord._id, { $inc: { 'licenseStats.totalLicensesSold': 1, 'licenseStats.monthlyLicensesSold': 1 } });
    await calculateCommission(gramCoord._id, licenses[0].membershipFee, 'license_sale', sale1._id);
    console.log('💰 Sale 1 (KCL → Rajesh) done');

    // Sale 2: Education Class 9 to Sunita
    const sale2 = await ProductSale.create({
      productType: 'education',
      educationProgram: eduPrograms[3]._id,
      customerName: sunita.fullName,
      customer: sunita._id,
      soldBy: gramCoord._id,
      amount: eduPrograms[3].fee,
    });
    await User.findByIdAndUpdate(gramCoord._id, { $inc: { 'licenseStats.totalLicensesSold': 1, 'licenseStats.monthlyLicensesSold': 1 } });
    await calculateCommission(gramCoord._id, eduPrograms[3].fee, 'education_sale', sale2._id);
    console.log('📚 Sale 2 (Class 9 → Sunita) done');

    // Sale 3: License (MSC) to Agent, sold by Kanpur President
    const sale3 = await ProductSale.create({
      productType: 'license',
      licenseType: licenses[1]._id,
      customerName: agent.fullName,
      customer: agent._id,
      soldBy: kanpurPres._id,
      amount: licenses[1].membershipFee,
    });
    await User.findByIdAndUpdate(kanpurPres._id, { $inc: { 'licenseStats.totalLicensesSold': 1, 'licenseStats.monthlyLicensesSold': 1 } });
    await calculateCommission(kanpurPres._id, licenses[1].membershipFee, 'license_sale', sale3._id);
    console.log('💼 Sale 3 (MSC → Agent) done');

    // Donations
    await Donation.insertMany([
      { donorName: rajesh.fullName, email: rajesh.email, amount: 500, purpose: 'गरीब बच्चों की शिक्षा', user: rajesh._id, type: 'cash', state: rajesh.state, district: rajesh.district, block: rajesh.block, village: rajesh.village, createdBy: gramCoord._id },
      { donorName: sunita.fullName, email: sunita.email, amount: 1000, purpose: 'स्वास्थ्य शिविर', user: sunita._id, type: 'cash', state: sunita.state, district: sunita.district, block: sunita.block, village: sunita.village, createdBy: gramCoord._id },
    ]);
    console.log('💝 Donations created');

    // Beneficiaries
    await Beneficiary.insertMany([
      { name: 'मोहन लाल', phone: '9000000001', address: 'Kakori, Lucknow', category: 'health', createdBy: gramCoord._id, state: gramCoord.state, district: gramCoord.district, block: gramCoord.block, village: gramCoord.village },
      { name: 'सरिता देवी', phone: '9000000002', address: 'Kakori, Lucknow', category: 'education', createdBy: gramCoord._id, state: gramCoord.state, district: gramCoord.district, block: gramCoord.block, village: gramCoord.village },
    ]);
    console.log('🧑‍🤝‍🧑 Beneficiaries added');

    // Campaign
    await Campaign.create({
      title: 'गाँव में स्वच्छता अभियान',
      description: 'सार्वजनिक स्थलों पर सफाई और कूड़ेदान लगाने हेतु धन संग्रह',
      targetAmount: 50000,
      goalAmount: 50000,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      createdBy: gramCoord._id,
      state: gramCoord.state, district: gramCoord.district, block: gramCoord.block, village: gramCoord.village,
    });
    console.log('📢 Campaign created');

    // Event
    await Event.create({
      title: 'स्वास्थ्य जाँच शिविर',
      description: 'मुफ्त स्वास्थ्य परीक्षण एवं दवा वितरण',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      venue: 'प्राथमिक विद्यालय, काकोरी',
      createdBy: gramCoord._id,
      state: gramCoord.state, district: gramCoord.district, block: gramCoord.block, village: gramCoord.village,
    });
    console.log('📅 Event created');

    // Expense
    await Expense.create({
      category: 'यात्रा व्यय',
      amount: 2500,
      description: 'लखनऊ से बक्शी का तालाब तक फील्ड विजिट',
      date: new Date(),
      createdBy: gramCoord._id,
      state: gramCoord.state, district: gramCoord.district, block: gramCoord.block, village: gramCoord.village,
    });
    console.log('💸 Expense created');

    console.log('🎉 सम्पूर्ण सीडिंग सफल! सभी रोल्स के उपयोगकर्ता, कॉन्ट्रैक्ट और डेमो डेटा तैयार हैं।');
  } catch (err) {
    console.error('❌ सीडिंग विफल:', err);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

seedFull();