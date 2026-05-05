const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const User = require('../models/user.model');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { calculateCommission } = require('../services/commission.service');   // MLM
const mailer = require('../utils/sendEmail');                                // 🆕 email service

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---------- PUBLIC (for users) ----------

// Get all active plans
exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true });
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create Razorpay order for a subscription
exports.purchaseSubscription = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({ success: false, message: 'Plan not available' });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: plan.price * 100,
      currency: 'INR',
      receipt: `sub_${req.user.id}_${Date.now()}`,
      notes: { userId: req.user.id, planId: plan._id }
    });

    // Record payment attempt
    await SubscriptionPayment.create({
      user: req.user.id,
      plan: plan._id,
      amount: plan.price,
      razorpayOrderId: order.id,
      status: 'created'
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Verify Razorpay payment & activate subscription
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Find payment record
    const payment = await SubscriptionPayment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // Update payment record
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    // Activate subscription for user
    const plan = await SubscriptionPlan.findById(payment.plan);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    const user = await User.findById(req.user.id);
    user.activeSubscription = {
      plan: plan.module,
      expiresAt: expiryDate,
      autoRenew: false
    };
    user.subscriptionHistory.push({
      plan: plan.module,
      startDate: new Date(),
      endDate: expiryDate,
      amountPaid: plan.price,
      transactionId: payment._id
    });
    await user.save();

    // MLM commission for subscription purchase
    await calculateCommission(req.user.id, plan.price, 'subscription', payment._id);

    // 🆕 Send subscription activation email
    try {
      await mailer.sendSubscriptionActivated(
        user.email,
        user.fullName,
        plan.name,
        expiryDate
      );
    } catch (emailErr) {
      console.error('Subscription activation email failed:', emailErr.message);
    }

    res.json({ success: true, message: 'Subscription activated', expiresAt: expiryDate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get current user's subscription status
exports.mySubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('activeSubscription subscriptionHistory');
    res.json({ success: true, ...user.toObject() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Cancel subscription (just mark it – auto‑renew off)
exports.cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.activeSubscription.autoRenew = false;
    await user.save();
    res.json({ success: true, message: 'Auto‑renew turned off' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- ADMIN ----------

// Admin: CRUD plans
exports.createPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.create(req.body);
    res.status(201).json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    await SubscriptionPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Admin: all payments
exports.getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, userId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (userId) query.user = userId;
    const payments = await SubscriptionPayment.find(query)
      .populate('user', 'fullName email')
      .populate('plan', 'name price durationDays')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await SubscriptionPayment.countDocuments(query);
    res.json({ success: true, payments, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};