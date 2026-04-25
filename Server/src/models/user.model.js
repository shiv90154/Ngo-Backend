const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const roleLevelMap = {
  SUPER_ADMIN: 0,
  ADDITIONAL_DIRECTOR: 1,
  STATE_OFFICER: 2,
  DISTRICT_MANAGER: 3,
  DISTRICT_PRESIDENT: 4,
  FIELD_OFFICER: 5,
  BLOCK_OFFICER: 6,
  VILLAGE_OFFICER: 7,
  DOCTOR: 8,
  TEACHER: 8,
  AGENT: 8,
  USER: 9,
};

const userSchema = new mongoose.Schema(
  {
    // ========== BASIC INFO ==========
    fullName: { type: String, required: [true, 'Full name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      match: [/^\d{10}$/, 'Phone number must be exactly 10 digits'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: [
        'SUPER_ADMIN',
        'ADDITIONAL_DIRECTOR',
        'STATE_OFFICER',
        'DISTRICT_MANAGER',
        'DISTRICT_PRESIDENT',
        'FIELD_OFFICER',
        'BLOCK_OFFICER',
        'VILLAGE_OFFICER',
        'DOCTOR',
        'TEACHER',
        'AGENT',
        'USER',
      ],
      default: 'USER',
    },
    modules: {
      type: [String],
      enum: ['EDUCATION', 'AGRICULTURE', 'FINANCE', 'HEALTHCARE', 'SOCIAL', 'IT', 'MEDIA', 'CRM', 'ECOMMERCE'],
      default: [],
    },

    // ========== HIERARCHY & MLM ==========
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hierarchyLevel: { type: Number, default: 0, min: 0 },
    sponsorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralCode: { type: String, unique: true, sparse: true },
    mlmLevel: { type: Number, default: 0 },
    leftChild: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rightChild: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    teamSize: { type: Number, default: 0 },

    // ========== PERSONAL DETAILS ==========
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    dob: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    bloodGroup: { type: String, trim: true },
    allergies: { type: String, trim: true },
    medicalHistory: { type: String, trim: true },

    // ========== KYC & ADDRESS ==========
    aadhaarNumber: {
      type: String,
      match: [/^\d{12}$/, 'Aadhaar must be 12 digits'],
      unique: true,
      sparse: true,
      default: null,
      set: v => (v === '' ? null : v),
    },
    panNumber: {
      type: String,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'],
      uppercase: true,
      unique: true,
      sparse: true,
      default: null,
      set: v => (v === '' ? null : v),
    },
    voterId: { type: String, unique: true, sparse: true, trim: true },
    passportNumber: { type: String, unique: true, sparse: true, trim: true },
    aadhaarImage: String,
    panImage: String,
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    block: { type: String, trim: true },
    village: { type: String, trim: true },
    pincode: { type: String, match: [/^\d{6}$/, 'Pincode must be 6 digits'] },
    fullAddress: { type: String, trim: true },
    profileImage: String,
    profilePicture: String,   // additional field
    signature: String,

    // ========== EMERGENCY CONTACT ==========
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    // ========== EDUCATION MODULE ==========
    // For teachers
    teacherProfile: {
      specialization: { type: String, trim: true },
      qualifications: [String],
      experienceYears: { type: Number, min: 0, default: 0 },
      taughtCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
      earnings: { type: Number, default: 0 },
    },
    // For students
    educationProfile: {
      className: { type: String, trim: true },
      schoolName: { type: String, trim: true },
      board: { type: String, trim: true },
      percentage: { type: String, trim: true },
    },
    enrolledCourses: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        progress: { type: Number, default: 0, min: 0, max: 100 },
        completed: { type: Boolean, default: false },
        enrolledAt: { type: Date, default: Date.now },
        lastAccessed: Date,
      },
    ],
    testResults: [
      {
        testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
        score: Number,
        percentage: Number,
        certificateUrl: String,
        takenAt: { type: Date, default: Date.now },
      },
    ],
    certificates: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        certificateUrl: String,
        issuedAt: Date,
        verificationCode: String,
      },
    ],
    liveClassAttendance: [
      {
        classId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveClass' },
        attendedAt: Date,
      },
    ],

    // ========== HEALTHCARE MODULE ==========
    doctorProfile: {
      specialization: { type: String, trim: true },
      experienceYears: { type: Number, min: 0, default: 0 },
      consultationFee: { type: Number, min: 0, default: 0 },
      registrationNumber: { type: String, trim: true },
      availableSlots: [Date],
    },
    patients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
    // Health records as sub‑documents (not references)
    healthRecords: [
      {
        recordType: { type: String, enum: ['lab_report', 'diagnosis', 'vaccination', 'surgery'] },
        title: String,
        description: String,
        fileUrl: String,
        date: Date,
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    prescriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }],

    // ========== AGRICULTURE MODULE ==========
    farmerProfile: {
      landSize: { type: Number, min: 0, default: 0 },
      crops: [String],
      farmingType: { type: String, enum: ['organic', 'conventional', 'mixed'], default: 'conventional' },
      isContractFarmer: { type: Boolean, default: false },
      farmLocation: { type: String, trim: true },      // added
      irrigationType: { type: String, trim: true },    // added
    },
    // Product listings as sub‑documents (not references)
    productListings: [
      {
        name: String,
        price: Number,
        quantity: Number,
        unit: String,
        category: String,
        description: String,
        imageUrl: String,
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    contractFarmingAgreements: [
      {
        buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        crop: String,
        quantity: Number,
        pricePerUnit: Number,
        startDate: Date,
        endDate: Date,
        status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' },
      },
    ],

    // ========== FINANCE MODULE ==========
    walletBalance: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0 },
    bankAccount: {
      accountNumber: { type: String, trim: true },
      ifsc: { type: String, trim: true },
      bankName: { type: String, trim: true },
      accountHolderName: { type: String, trim: true },
    },
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
    // Loans as sub‑documents
    loans: [
      {
        amount: Number,
        emiAmount: Number,
        tenureMonths: Number,
        outstanding: Number,
        nextDueDate: Date,
        status: { type: String, enum: ['active', 'closed', 'defaulted'], default: 'active' },
        sanctionedAt: Date,
      },
    ],
    billPayments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BillPayment' }],

    // ========== MLM / COMMISSION ==========
    commissionRate: { type: Number, default: 0, min: 0, max: 100 },
    totalCommissionEarned: { type: Number, default: 0 },
    mlmPayoutInfo: {
      lastPayoutDate: Date,
      nextPayoutDate: Date,
      pendingCommission: { type: Number, default: 0, min: 0 },
      totalWithdrawn: { type: Number, default: 0, min: 0 },
    },

    // ========== SOCIAL MODULE ==========
    socialProfile: {
      username: { type: String, trim: true, unique: true, sparse: true },
      bio: { type: String, trim: true },
      interests: { type: String, trim: true },
      followersCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
    },

    // ========== IT MODULE ==========
    itProfile: {
      projectType: { type: String, trim: true },
      techStack: { type: String, trim: true },
      experience: { type: String, trim: true },
    },

    // ========== NEWS & MEDIA MODULE ==========
    mediaCreatorProfile: {
      isCreator: { type: Boolean, default: false },
      creatorStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      totalPosts: { type: Number, default: 0 },
      totalFollowers: { type: Number, default: 0 },
      monetizationEarnings: { type: Number, default: 0 },
      liveStreamingKey: String,
    },
    mediaPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MediaPost' }],

    // ========== CRM & IT MODULE ==========
    // Clients and Projects as sub‑documents (controller pushes direct objects)
    clients: [
      {
        name: String,
        email: String,
        phone: String,
        company: String,
        gstNumber: String,
        address: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    projects: [
      {
        name: String,
        description: String,
        clientId: String,   // can be ObjectId or string
        startDate: Date,
        endDate: Date,
        budget: Number,
        status: { type: String, default: 'active' },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ========== E‑COMMERCE / VILLAGE STORE ==========
    sellerProfile: {
      isSeller: { type: Boolean, default: false },
      storeName: String,
      gstNumber: String,
      storeLogo: String,
      rating: { type: Number, default: 0, min: 0, max: 5 },
    },
    storeProducts: [
      {
        name: String,
        price: Number,
        category: String,
        stock: Number,
        description: String,
        imageUrl: String,
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    exchangeRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeRequest' }],

    // ========== SUBSCRIPTION & OTP ==========
    otp: String,
    otpExpire: Date,
    isVerified: { type: Boolean, default: false },
    activeSubscription: {
      plan: { type: String, enum: ['EDUCATION', 'HEALTH', 'AGRICULTURE', 'NONE'], default: 'NONE' },
      expiresAt: { type: Date, default: null },
      autoRenew: { type: Boolean, default: false },
    },
    subscriptionHistory: [
      {
        plan: { type: String, enum: ['EDUCATION', 'HEALTH', 'AGRICULTURE', 'NONE'] },
        startDate: Date,
        endDate: Date,
        amountPaid: Number,
        transactionId: String,
      },
    ],

    // ========== AI USAGE TRACKING ==========
    aiUsage: {
      diseaseDetectionCount: { type: Number, default: 0 },
      cropDetectionCount: { type: Number, default: 0 },
      lastDetectionAt: Date,
      aiTokensRemaining: { type: Number, default: 10 },
    },

    // ========== SECURITY & AUDIT ==========
    twoFactorEnabled: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,

    // ========== DEVELOPER / QA TRACKING ==========
    developedBy: { type: String, trim: true },
    testedBy: { type: String, trim: true },
    qaStatus: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },

    // ========== STANDARD AUDIT FIELDS ==========
    lastLogin: { type: Date, default: null },
    lastLoginIP: { type: String, trim: true, default: null },
    deviceInfo: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// ========== INDEXES ==========
userSchema.index({ role: 1 });
userSchema.index({ modules: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ reportsTo: 1 });
userSchema.index({ sponsorId: 1 });
userSchema.index({ hierarchyLevel: 1 });
userSchema.index({ sponsorId: 1, hierarchyLevel: 1 });
userSchema.index({ 'doctorProfile.specialization': 1 });
userSchema.index({ 'teacherProfile.specialization': 1 });
userSchema.index({ 'farmerProfile.crops': 1 });
userSchema.index({ 'activeSubscription.plan': 1 });
userSchema.index({ 'activeSubscription.expiresAt': 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ 'mediaCreatorProfile.isCreator': 1 });
userSchema.index({ 'sellerProfile.isSeller': 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

// ========== STATIC METHOD: Generate Unique Referral Code ==========
userSchema.statics.generateUniqueReferralCode = async function () {
  const User = this;
  let code;
  let exists;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    exists = await User.exists({ referralCode: code });
  } while (exists);
  return code;
};

// ========== PRE‑SAVE HOOKS ==========
userSchema.pre('save', async function () {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Generate unique referral code for new users
  if (this.isNew && !this.referralCode) {
    this.referralCode = await this.constructor.generateUniqueReferralCode();
  }

  // Set hierarchyLevel based on role if not provided
  if (this.isNew && !this.hierarchyLevel) {
    this.hierarchyLevel = roleLevelMap[this.role] || 9;
  }
});

// ========== INSTANCE METHODS ==========
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isSubscriptionActive = function () {
  return this.activeSubscription.plan !== 'NONE' && this.activeSubscription.expiresAt > new Date();
};

userSchema.methods.updateLastLogin = function (ip, device) {
  this.lastLogin = new Date();
  this.lastLoginIP = ip || null;
  this.deviceInfo = device || null;
  return this.save();
};

// ========== VIRTUAL FIELDS ==========
userSchema.virtual('fullAddressString').get(function () {
  const parts = [this.fullAddress, this.village, this.block, this.district, this.state, this.pincode].filter(Boolean);
  return parts.join(', ');
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);