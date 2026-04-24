// createSuperAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ============================================
// 🔧 在这里修改超级管理员的凭据
// ============================================
const ADMIN_CONFIG = {
  fullName: 'Super Admin',
  email: 'admin@samraddh.gov.in',
  phone: '9876543210',
  password: 'Admin@123456',
};

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in .env file');
  process.exit(1);
}

// 用户模型（与你的实际模型保持一致）
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'SUPER_ADMIN' },
  isVerified: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  modules: { type: [String], default: [] },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 检查是否已存在
    const existing = await User.findOne({
      $or: [{ email: ADMIN_CONFIG.email }, { phone: ADMIN_CONFIG.phone }],
    });

    if (existing) {
      console.log('⚠️  Super admin already exists:');
      console.log(`   Email: ${existing.email}`);
      console.log(`   Role:  ${existing.role}`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // 哈希密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.password, salt);

    // 创建管理员
    const admin = await User.create({
      fullName: ADMIN_CONFIG.fullName,
      email: ADMIN_CONFIG.email,
      phone: ADMIN_CONFIG.phone,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isVerified: true,
      isActive: true,
      modules: [
        'EDUCATION',
        'HEALTHCARE',
        'AGRICULTURE',
        'FINANCE',
        'IT',
        'MEDIA',
        'CRM',
        'ECOMMERCE',
      ],
    });

    console.log('\n✅ Super Admin created successfully!');
    console.log('--------------------------------');
    console.log(`Name:     ${admin.fullName}`);
    console.log(`Email:    ${admin.email}`);
    console.log(`Password: ${ADMIN_CONFIG.password}`);
    console.log(`Role:     ${admin.role}`);
    console.log('--------------------------------\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createSuperAdmin();