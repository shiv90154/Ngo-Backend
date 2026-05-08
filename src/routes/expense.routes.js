const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const expenseController = require('../controllers/expense.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

router.get('/', protect, restrictTo(...ALLOWED), expenseController.getExpenses);
router.post('/', protect, restrictTo(...ALLOWED), expenseController.createExpense);
router.put('/:id', protect, restrictTo(...ALLOWED), expenseController.updateExpense);
router.delete('/:id', protect, restrictTo(...ALLOWED), expenseController.deleteExpense);
router.get('/export/pdf', protect, restrictTo(...ALLOWED), expenseController.exportExpensesPDF);

module.exports = router;