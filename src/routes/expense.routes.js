const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const scopeFilter = require('../middleware/scopeFilter');
const expenseController = require('../controllers/expense.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

router.use(protect);
router.use(scopeFilter);   // हर रिक्वेस्ट पर req.scopeFilter सेट करता है

router.get('/', restrictTo(...ALLOWED), expenseController.getExpenses);
router.post('/', restrictTo(...ALLOWED), expenseController.createExpense);
router.put('/:id', restrictTo(...ALLOWED), expenseController.updateExpense);
router.delete('/:id', restrictTo(...ALLOWED), expenseController.deleteExpense);
router.get('/export/pdf', restrictTo(...ALLOWED), expenseController.exportExpensesPDF);

module.exports = router;