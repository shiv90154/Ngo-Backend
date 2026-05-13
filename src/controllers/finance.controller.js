
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/user.model');
const Transaction = require('../models/Transaction.model');
const Loan = require('../models/Loan.model');
const BillPayment = require('../models/BillPayment.model');
const AepsRequest = require('../models/AepsRequest.model');
const { calculateCommission } = require('../services/mlmEngine');
const mailer = require('../utils/sendEmail');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── 1. CREATE WALLET TOP‑UP ORDER ──
exports.createWalletOrder = catchAsync(async (req, res, next) => {
  const { amount } = req.body;
  if (!amount || amount < 10) {
    return next(new AppError('न्यूनतम राशि ₹10 है', 400));
  }

  // ✅ छोटा और यूनिक रिसीट — हमेशा 40 कैरेक्टर से कम
  const shortId = req.user.id.toString().slice(-6);
  const timestamp = Date.now().toString(36);   // बेस36 से कम कैरेक्टर
  const receipt = `w_${shortId}_${timestamp}`.slice(0, 40);

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: 'INR',
    receipt,
    notes: { userId: req.user.id, type: 'wallet_topup' }
  });

  res.json({
    success: true,
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    }
  });
});

// ── 2. VERIFY PAYMENT SIGNATURE ──
exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  // 1. Verify signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');
  if (generatedSignature !== razorpay_signature) {
    return next(new AppError('अमान्य भुगतान हस्ताक्षर', 400));
  }

  try {
    // 2. Fetch the Razorpay order to get amount and notes
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const amount = order.amount / 100;  // convert paise to INR
    const userId = order.notes?.userId;

    if (!userId) {
      return next(new AppError('Order notes में userId नहीं है', 400));
    }

    // 3. Credit wallet (same as webhook does, but now from verify endpoint)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        return next(new AppError('यूज़र नहीं मिला', 404));
      }

      user.walletBalance += amount;
      user.totalEarnings += amount;
      await user.save({ session });

      await Transaction.create([{
        user: userId,
        type: 'credit',
        amount,
        description: `Wallet top‑up via Razorpay (${razorpay_payment_id})`,
        referenceId: razorpay_payment_id,
        status: 'completed'
      }], { session });

      // Optional: Trigger MLM commission (if applicable)
      await calculateCommission(userId, amount, 'wallet_topup', razorpay_payment_id);

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      console.error('Transaction error:', err);
      return next(new AppError('वॉलेट अपडेट करने में त्रुटि', 500));
    } finally {
      session.endSession();
    }

    res.json({ success: true, message: 'Payment verified and wallet credited' });
  } catch (error) {
    console.error('Verify error:', error);
    return next(new AppError('Payment verification processing failed', 500));
  }
});

// ── 3. RAZORPAY WEBHOOK (सुरक्षित बॉडी पार्सिंग) ──
exports.razorpayWebhook = catchAsync(async (req, res, next) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;
  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const userId = payment.notes?.userId;
    if (userId) {
      const amount = payment.amount / 100;

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const user = await User.findById(userId).session(session);
        if (user) {
          user.walletBalance += amount;
          user.totalEarnings += amount;
          await user.save({ session });

          await Transaction.create([{
            user: userId,
            type: 'credit',
            amount,
            description: `Wallet top‑up via Razorpay (${payment.id})`,
            referenceId: payment.id,
            status: 'completed'
          }], { session });

          // MLM Commission for wallet top‑up
          await calculateCommission(userId, amount, 'wallet_topup', payment.id);
        }
        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        console.error('Webhook transaction error:', err);
      } finally {
        session.endSession();
      }
    }
  }
  res.json({ received: true });
});

// ── 4. ADD FUNDS (Admin) ──
exports.addFunds = catchAsync(async (req, res, next) => {
  const { amount, description } = req.body;
  if (!amount || amount <= 0) {
    return next(new AppError('अमान्य राशि', 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.user.id).session(session);
    user.walletBalance += amount;
    user.totalEarnings += amount;
    await user.save({ session });

    await Transaction.create([{
      user: req.user.id,
      type: 'credit',
      amount,
      description: description || 'Manual credit',
      status: 'completed'
    }], { session });

    await session.commitTransaction();
    res.json({ success: true, data: { balance: user.walletBalance } });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 500));
  } finally {
    session.endSession();
  }
});

// ── 5. TRANSFER FUNDS ──
exports.transferFunds = catchAsync(async (req, res, next) => {
  const { toUserId, amount, description } = req.body;
  if (!toUserId || !amount || amount <= 0) {
    return next(new AppError('अमान्य अनुरोध', 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const fromUser = await User.findById(req.user.id).session(session);
    if (fromUser.walletBalance < amount) {
      await session.abortTransaction();
      return next(new AppError('पर्याप्त बैलेंस नहीं है', 400));
    }
    const toUser = await User.findById(toUserId).session(session);
    if (!toUser) {
      await session.abortTransaction();
      return next(new AppError('प्राप्तकर्ता नहीं मिला', 404));
    }

    fromUser.walletBalance -= amount;
    await fromUser.save({ session });
    toUser.walletBalance += amount;
    await toUser.save({ session });

    await Transaction.create([{
      user: req.user.id, type: 'debit', amount,
      description: description || `Transfer to ${toUser.fullName}`
    }], { session });
    await Transaction.create([{
      user: toUserId, type: 'credit', amount,
      description: description || `Transfer from ${fromUser.fullName}`
    }], { session });

    await session.commitTransaction();
    res.json({ success: true, data: { balance: fromUser.walletBalance } });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 500));
  } finally {
    session.endSession();
  }
});

// ── 6. LOAN: APPLY ──
exports.applyLoan = catchAsync(async (req, res, next) => {
  const { amount, tenureMonths } = req.body;
  if (!amount || amount < 1000) {
    return next(new AppError('न्यूनतम ऋण राशि ₹1000 है', 400));
  }
  const interestRate = 12;
  const monthlyRate = interestRate / 12 / 100;
  const emiAmount = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  const totalPayable = emiAmount * tenureMonths;

  const loan = await Loan.create({
    user: req.user.id,
    amount,
    emiAmount: Math.round(emiAmount),
    tenureMonths,
    outstanding: Math.round(totalPayable),
    interestRate,
    nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'active'
  });

  const user = await User.findById(req.user.id);
  user.walletBalance += amount;
  user.loans.push(loan._id);
  await user.save();

  await Transaction.create({
    user: req.user.id,
    type: 'credit',
    amount,
    description: `Loan sanctioned - ${loan._id}`
  });

  try {
    await mailer.sendLoanSanctioned(user.email, user.fullName, amount);
  } catch (emailErr) {
    console.error('Loan sanctioned email failed:', emailErr.message);
  }

  res.status(201).json({ success: true, data: loan });
});

// ── 7. LOAN: MY LOANS ──
exports.getMyLoans = catchAsync(async (req, res) => {
  const loans = await Loan.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, data: loans });
});

// ── 8. LOAN: REPAY EMI ──
exports.repayEmi = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const loan = await Loan.findById(req.params.loanId).session(session);
    if (!loan || loan.user.toString() !== req.user.id || loan.status !== 'active') {
      await session.abortTransaction();
      return next(new AppError('लोन सक्रिय नहीं है', 400));
    }
    const user = await User.findById(req.user.id).session(session);
    if (user.walletBalance < loan.emiAmount) {
      await session.abortTransaction();
      return next(new AppError('पर्याप्त बैलेंस नहीं है', 400));
    }

    user.walletBalance -= loan.emiAmount;
    await user.save({ session });
    loan.outstanding -= loan.emiAmount;
    loan.emisPaid += 1;
    if (loan.outstanding <= 0) {
      loan.status = 'closed';
      loan.closedAt = new Date();
    } else {
      loan.nextDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    await loan.save({ session });

    await Transaction.create([{
      user: req.user.id,
      type: 'debit',
      amount: loan.emiAmount,
      description: `EMI payment for loan ${loan._id}`
    }], { session });

    await session.commitTransaction();
    res.json({ success: true, data: loan });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 500));
  } finally {
    session.endSession();
  }
});

// ── 9. BILL PAYMENT ──
exports.payBill = catchAsync(async (req, res, next) => {
  const { billType, billNumber, amount } = req.body;
  if (!billType || !billNumber || !amount) {
    return next(new AppError('सभी फ़ील्ड आवश्यक हैं', 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.user.id).session(session);
    if (user.walletBalance < amount) {
      await session.abortTransaction();
      return next(new AppError('पर्याप्त बैलेंस नहीं है', 400));
    }

    // Dummy BBPS API call (actual API to be integrated)
    const bbpsResponse = await axios.post(process.env.BBPS_API_URL, {
      billerId: billType,
      customerId: billNumber,
      amount,
      referenceId: `BILL_${Date.now()}`
    }, {
      headers: {
        'x-api-key': process.env.BBPS_API_KEY,
        'x-merchant-id': process.env.BBPS_MERCHANT_ID
      }
    });

    if (!bbpsResponse.data.success) {
      throw new Error('BBPS payment failed');
    }

    user.walletBalance -= amount;
    await user.save({ session });

    const [billPayment] = await BillPayment.create([{
      user: req.user.id,
      billType,
      billNumber,
      amount,
      status: 'paid',
      paidAt: new Date()
    }], { session });

    const [transaction] = await Transaction.create([{
      user: req.user.id,
      type: 'debit',
      amount,
      description: `${billType.toUpperCase()} bill payment - ${billNumber}`,
      referenceId: billPayment._id
    }], { session });

    billPayment.transactionId = transaction._id;
    await billPayment.save({ session });

    await session.commitTransaction();
    res.json({ success: true, data: { balance: user.walletBalance } });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 500));
  } finally {
    session.endSession();
  }
});

// ── 10. BILL HISTORY ──
exports.getBillHistory = catchAsync(async (req, res) => {
  const bills = await BillPayment.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, data: bills });
});

// ── 11. AEPS WITHDRAWAL ──
exports.aepsWithdraw = catchAsync(async (req, res, next) => {
  const { aadhaarNumber, amount, bankIIN } = req.body;
  if (!aadhaarNumber || !amount || amount < 100) {
    return next(new AppError('अमान्य अनुरोध', 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.user.id).session(session);
    if (user.walletBalance < amount) {
      await session.abortTransaction();
      return next(new AppError('पर्याप्त बैलेंस नहीं है', 400));
    }

    const aepsResponse = await axios.post(process.env.AEPS_API_URL, {
      aadhaarNumber,
      amount,
      bankIIN,
      merchantId: process.env.AEPS_MERCHANT_ID,
      transactionId: `AEPS_${Date.now()}`
    }, {
      headers: { 'x-api-key': process.env.AEPS_API_KEY }
    });

    if (!aepsResponse.data.success) {
      throw new Error('AEPS withdrawal failed');
    }

    user.walletBalance -= amount;
    await user.save({ session });

    const [aepsRequest] = await AepsRequest.create([{
      user: req.user.id,
      aadhaarNumber,
      bankIIN,
      amount,
      type: 'withdrawal',
      status: 'success'
    }], { session });

    await Transaction.create([{
      user: req.user.id,
      type: 'debit',
      amount,
      description: `AEPS withdrawal - Aadhaar ${aadhaarNumber.slice(-4)}`,
      referenceId: aepsRequest._id
    }], { session });

    await session.commitTransaction();
    res.json({ success: true, data: { balance: user.walletBalance } });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 500));
  } finally {
    session.endSession();
  }
});

// ── 12. BANK ACCOUNT VERIFICATION ──
exports.verifyBankAccount = catchAsync(async (req, res, next) => {
  const { accountNumber, ifsc, accountHolderName, bankName } = req.body;
  if (!accountNumber || !ifsc) {
    return next(new AppError('खाता संख्या और IFSC आवश्यक हैं', 400));
  }

  const verification = await axios.post(process.env.BANK_VERIFICATION_API_URL, {
    accountNumber,
    ifsc,
    name: accountHolderName
  }, {
    headers: { 'x-api-key': process.env.BANK_VERIFICATION_API_KEY }
  });

  if (!verification.data.valid) {
    return next(new AppError('बैंक खाता सत्यापित नहीं हुआ', 400));
  }

  const user = await User.findById(req.user.id);
  user.bankAccount = {
    accountNumber,
    ifsc,
    bankName,
    accountHolderName,
    verified: true
  };
  await user.save();

  res.json({ success: true, message: 'Bank account verified and saved' });
});

// ── 13. UPDATE BANK ACCOUNT ──
exports.updateBankAccount = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  user.bankAccount = { ...user.bankAccount, ...req.body };
  await user.save();
  res.json({ success: true, data: user.bankAccount });
});

// ── 14. GET BANK ACCOUNT ──
exports.getBankAccount = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('bankAccount');
  res.json({ success: true, data: user.bankAccount });
});

// ── 15. WALLET DETAILS ──
exports.getWallet = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('walletBalance totalEarnings');
  const transactions = await Transaction.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({
    success: true,
    data: {
      balance: user.walletBalance,
      totalEarnings: user.totalEarnings,
      transactions
    }
  });
});

// ── 16. FINANCE DASHBOARD ──
exports.getDashboard = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('walletBalance totalEarnings');
  const activeLoans = await Loan.find({ user: req.user.id, status: 'active' });
  const totalLoanOutstanding = activeLoans.reduce((sum, l) => sum + l.outstanding, 0);
  const recentTransactions = await Transaction.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(5);

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
});