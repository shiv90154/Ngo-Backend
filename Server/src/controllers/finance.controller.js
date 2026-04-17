const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/user.model');
const Transaction = require('../models/Transaction.model');
const Loan = require('../models/Loan.model');
const BillPayment = require('../models/BillPayment.model');
const AepsRequest = require('../models/AepsRequest.model');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ======================
// WALLET (RAZORPAY)
// ======================
exports.createWalletOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 10) return res.status(400).json({ success: false, message: 'Minimum amount ₹10' });
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `wallet_${req.user.id}_${Date.now()}`,
      notes: { userId: req.user.id, type: 'wallet_topup' }
    });
    res.json({ success: true, data: { orderId: order.id, amount: order.amount, currency: order.currency } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (signature !== expectedSignature) return res.status(400).send('Invalid signature');
  const event = req.body;
  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const userId = payment.notes?.userId;
    if (userId) {
      const amount = payment.amount / 100;
      const user = await User.findById(userId);
      if (user) {
        user.walletBalance += amount;
        user.totalEarnings += amount;
        await user.save();
        await Transaction.create({
          user: userId,
          type: 'credit',
          amount,
          description: `Wallet top-up via Razorpay (${payment.id})`,
          referenceId: payment.id,
          status: 'completed'
        });
      }
    }
  }
  res.json({ received: true });
};

exports.addFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });
    const user = await User.findById(req.user.id).session(session);
    user.walletBalance += amount;
    user.totalEarnings += amount;
    await user.save({ session });
    await Transaction.create([{
      user: req.user.id, type: 'credit', amount, description: description || 'Manual credit', status: 'completed'
    }], { session });
    await session.commitTransaction();
    res.json({ success: true, data: { balance: user.walletBalance } });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally { session.endSession(); }
};

exports.transferFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { toUserId, amount, description } = req.body;
    if (!toUserId || !amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid request' });
    const fromUser = await User.findById(req.user.id).session(session);
    if (fromUser.walletBalance < amount) return res.status(400).json({ success: false, message: 'Insufficient balance' });
    const toUser = await User.findById(toUserId).session(session);
    if (!toUser) return res.status(404).json({ success: false, message: 'Recipient not found' });
    fromUser.walletBalance -= amount;
    await fromUser.save({ session });
    toUser.walletBalance += amount;
    await toUser.save({ session });
    await Transaction.create([{ user: req.user.id, type: 'debit', amount, description: description || `Transfer to ${toUser.fullName}` }], { session });
    await Transaction.create([{ user: toUserId, type: 'credit', amount, description: description || `Transfer from ${fromUser.fullName}` }], { session });
    await session.commitTransaction();
    res.json({ success: true, data: { balance: fromUser.walletBalance } });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally { session.endSession(); }
};

// ======================
// LOANS
// ======================
exports.applyLoan = async (req, res) => {
  try {
    const { amount, tenureMonths } = req.body;
    if (!amount || amount < 1000) return res.status(400).json({ success: false, message: 'Minimum loan amount ₹1000' });
    const interestRate = 12;
    const monthlyRate = interestRate / 12 / 100;
    const emiAmount = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    const totalPayable = emiAmount * tenureMonths;
    const loan = await Loan.create({
      user: req.user.id, amount, emiAmount: Math.round(emiAmount), tenureMonths,
      outstanding: totalPayable, interestRate,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), status: 'active'
    });
    const user = await User.findById(req.user.id);
    user.walletBalance += amount;
    user.loans.push(loan._id);
    await user.save();
    await Transaction.create({ user: req.user.id, type: 'credit', amount, description: `Loan sanctioned - ${loan._id}` });
    res.status(201).json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.repayEmi = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const loan = await Loan.findById(req.params.loanId).session(session);
    if (!loan || loan.user.toString() !== req.user.id || loan.status !== 'active') return res.status(400).json({ success: false, message: 'Loan not active' });
    const user = await User.findById(req.user.id).session(session);
    if (user.walletBalance < loan.emiAmount) return res.status(400).json({ success: false, message: 'Insufficient balance' });
    user.walletBalance -= loan.emiAmount;
    await user.save({ session });
    loan.outstanding -= loan.emiAmount;
    loan.emisPaid += 1;
    if (loan.outstanding <= 0) { loan.status = 'closed'; loan.closedAt = new Date(); }
    else { loan.nextDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); }
    await loan.save({ session });
    await Transaction.create([{ user: req.user.id, type: 'debit', amount: loan.emiAmount, description: `EMI payment for loan ${loan._id}` }], { session });
    await session.commitTransaction();
    res.json({ success: true, data: loan });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally { session.endSession(); }
};

// ======================
// BILL PAYMENT (BBPS)
// ======================
exports.payBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { billType, billNumber, amount } = req.body;
    if (!billType || !billNumber || !amount) return res.status(400).json({ success: false, message: 'Missing fields' });
    const user = await User.findById(req.user.id).session(session);
    if (user.walletBalance < amount) return res.status(400).json({ success: false, message: 'Insufficient balance' });

    // REAL BBPS API CALL
    const bbpsResponse = await axios.post(process.env.BBPS_API_URL, {
      billerId: billType, customerId: billNumber, amount: amount, referenceId: `BILL_${Date.now()}`
    }, { headers: { 'x-api-key': process.env.BBPS_API_KEY, 'x-merchant-id': process.env.BBPS_MERCHANT_ID } });
    if (!bbpsResponse.data.success) throw new Error('BBPS payment failed');

    user.walletBalance -= amount;
    await user.save({ session });
    const billPayment = await BillPayment.create([{
      user: req.user.id, billType, billNumber, amount, status: 'paid', paidAt: new Date()
    }], { session });
    const transaction = await Transaction.create([{
      user: req.user.id, type: 'debit', amount, description: `${billType.toUpperCase()} bill payment - ${billNumber}`, referenceId: billPayment[0]._id
    }], { session });
    billPayment[0].transactionId = transaction[0]._id;
    await billPayment[0].save({ session });
    await session.commitTransaction();
    res.json({ success: true, data: { balance: user.walletBalance } });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally { session.endSession(); }
};

exports.getBillHistory = async (req, res) => {
  try {
    const bills = await BillPayment.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// AEPS WITHDRAWAL
// ======================
exports.aepsWithdraw = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { aadhaarNumber, amount, bankIIN } = req.body;
    if (!aadhaarNumber || !amount || amount < 100) return res.status(400).json({ success: false, message: 'Invalid request' });
    const user = await User.findById(req.user.id).session(session);
    if (user.walletBalance < amount) return res.status(400).json({ success: false, message: 'Insufficient balance' });

    // REAL AEPS API CALL
    const aepsResponse = await axios.post(process.env.AEPS_API_URL, {
      aadhaarNumber, amount, bankIIN, merchantId: process.env.AEPS_MERCHANT_ID, transactionId: `AEPS_${Date.now()}`
    }, { headers: { 'x-api-key': process.env.AEPS_API_KEY } });
    if (!aepsResponse.data.success) throw new Error('AEPS withdrawal failed');

    user.walletBalance -= amount;
    await user.save({ session });
    const aepsRequest = await AepsRequest.create([{
      user: req.user.id, aadhaarNumber, bankIIN, amount, type: 'withdrawal', status: 'success'
    }], { session });
    await Transaction.create([{
      user: req.user.id, type: 'debit', amount, description: `AEPS withdrawal - Aadhaar ${aadhaarNumber.slice(-4)}`, referenceId: aepsRequest[0]._id
    }], { session });
    await session.commitTransaction();
    res.json({ success: true, data: { balance: user.walletBalance } });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally { session.endSession(); }
};

// ======================
// BANK ACCOUNT (Verification)
// ======================
exports.verifyBankAccount = async (req, res) => {
  try {
    const { accountNumber, ifsc, accountHolderName, bankName } = req.body;
    if (!accountNumber || !ifsc) return res.status(400).json({ success: false, message: 'Missing fields' });
    const verification = await axios.post(process.env.BANK_VERIFICATION_API_URL, { accountNumber, ifsc, name: accountHolderName }, {
      headers: { 'x-api-key': process.env.BANK_VERIFICATION_API_KEY }
    });
    if (!verification.data.valid) return res.status(400).json({ success: false, message: 'Bank account not verified' });
    const user = await User.findById(req.user.id);
    user.bankAccount = { accountNumber, ifsc, bankName, accountHolderName, verified: true };
    await user.save();
    res.json({ success: true, message: 'Bank account verified and saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBankAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.bankAccount = { ...user.bankAccount, ...req.body };
    await user.save();
    res.json({ success: true, data: user.bankAccount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBankAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('bankAccount');
    res.json({ success: true, data: user.bankAccount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// WALLET & DASHBOARD
// ======================
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('walletBalance totalEarnings');
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: { balance: user.walletBalance, totalEarnings: user.totalEarnings, transactions } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('walletBalance totalEarnings');
    const activeLoans = await Loan.find({ user: req.user.id, status: 'active' });
    const totalLoanOutstanding = activeLoans.reduce((sum, l) => sum + l.outstanding, 0);
    const recentTransactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(5);
    res.json({
      success: true,
      data: {
        walletBalance: user.walletBalance,
        totalEarnings: user.totalEarnings,
        totalLoanOutstanding,
        activeLoansCount: activeLoans.length,
        recentTransactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};