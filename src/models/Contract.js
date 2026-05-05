const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,          // one active contract per user
    },
    role: {
      type: String,
      required: true,
    },
    // Personal info (duplicated for the contract)
    fullName: String,
    fatherName: String,
    dob: Date,
    address: String,
    phone: String,
    email: String,
    aadhaarNumber: String,
    panNumber: String,
    qualification: String,
    currentWork: String,
    state: String,
    district: String,
    block: String,
    gramPanchayat: String,
    photoAttached: Boolean,

    // Processing Fee
    processingFee: {
      amount: { type: Number, required: true },
      paid: { type: Boolean, default: false },
      mode: String,  // Cash, UPI, Bank Transfer, Online
      transactionId: String,
      paymentDate: Date,
      receiptUrl: String,   // uploaded receipt image
    },

    // Voluntary Donation
    donation: {
      amount: Number,
      paid: { type: Boolean, default: false },
      mode: String,
      transactionId: String,
      paymentDate: Date,
      chequeNumber: String,
      bankName: String,
      receiptUrl: String,
    },

    // Security Deposit
    securityDeposit: {
      amount: { type: Number, required: true },
      paid: { type: Boolean, default: false },
      mode: String,
      transactionId: String,
      paymentDate: Date,
      receiptUrl: String,
    },

    // Terms Acceptance
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    termsAcceptedAt: Date,

    // Digital Signature (base64 image or simple timestamp)
    signature: String,       // base64 data URL or file path
    signedAt: Date,

    // Admin Review
    adminStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNotes: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,

    // Status for user's own tracking
    status: {
      type: String,
      enum: ['draft', 'completed', 'rejected'],
      default: 'draft',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

contractSchema.index({ user: 1 });
contractSchema.index({ role: 1 });
contractSchema.index({ adminStatus: 1 });

module.exports = mongoose.model('Contract', contractSchema);