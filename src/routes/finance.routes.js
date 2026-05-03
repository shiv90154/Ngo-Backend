const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const {
  getDashboard,
  getWallet,
  createWalletOrder,
  verifyPayment,
  razorpayWebhook,
  addFunds,
  transferFunds,
  applyLoan,
  getMyLoans,
  repayEmi,
  payBill,
  getBillHistory,
  updateBankAccount,
  getBankAccount,
  verifyBankAccount,
  aepsWithdraw
} = require('../controllers/finance.controller');

// Public webhook (must be before protect)
router.post('/webhooks/razorpay', razorpayWebhook);

// All other routes require authentication
router.use(protect);

// Dashboard & Wallet
router.get('/dashboard', getDashboard);
router.get('/wallet', getWallet);
router.post('/wallet/add-order', createWalletOrder);
router.post('/wallet/verify', verifyPayment);
router.post('/wallet/add', restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), addFunds); // restricted
router.post('/wallet/transfer', transferFunds);

// Loans
router.get('/loans', getMyLoans);
router.post('/loans/apply', applyLoan);
router.post('/loans/:loanId/repay', repayEmi);

// Bills
router.post('/bills/pay', payBill);
router.get('/bills/history', getBillHistory);

// Bank Account
router.get('/bank-account', getBankAccount);
router.put('/bank-account', updateBankAccount);
router.post('/bank-account/verify', verifyBankAccount);

// AEPS
router.post('/aeps/withdraw', aepsWithdraw);

module.exports = router;