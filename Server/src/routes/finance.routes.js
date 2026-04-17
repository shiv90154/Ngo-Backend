const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getWallet, addFunds, createWalletOrder, razorpayWebhook, transferFunds,
  applyLoan, getMyLoans, repayEmi,
  payBill, getBillHistory,
  updateBankAccount, getBankAccount, verifyBankAccount,
  aepsWithdraw, getDashboard
} = require('../controllers/finance.controller');

// Public webhook
router.post('/webhooks/razorpay', razorpayWebhook);

// All other routes require authentication
router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/wallet', getWallet);
router.post('/wallet/add-order', createWalletOrder);
router.post('/wallet/add', addFunds);
router.post('/wallet/transfer', transferFunds);

router.get('/loans', getMyLoans);
router.post('/loans/apply', applyLoan);
router.post('/loans/:loanId/repay', repayEmi);

router.post('/bills/pay', payBill);
router.get('/bills/history', getBillHistory);

router.get('/bank-account', getBankAccount);
router.put('/bank-account', updateBankAccount);
router.post('/bank-account/verify', verifyBankAccount);

router.post('/aeps/withdraw', aepsWithdraw);

module.exports = router;