// backend/src/services/razorpayService.js
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order
 * @param {Number} amount - in INR
 * @param {Object} notes - additional metadata like userId, purpose, type
 * @returns {Object} order
 */
exports.createOrder = async (amount, notes = {}) => {
  const options = {
    amount: amount * 100, // paise
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes,
  };
  const order = await razorpay.orders.create(options);
  return {
    order_id: order.id,
    amount: order.amount,
    key_id: process.env.RAZORPAY_KEY_ID,
  };
};

/**
 * Verify payment signature
 * @param {String} order_id
 * @param {String} payment_id
 * @param {String} signature
 * @returns {Boolean}
 */
exports.verifySignature = (order_id, payment_id, signature) => {
  const generated = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(order_id + '|' + payment_id)
    .digest('hex');
  return generated === signature;
};