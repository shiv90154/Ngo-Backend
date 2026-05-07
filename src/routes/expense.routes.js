const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { protect, restrictTo } = require('../middleware');

router.post('/', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), expenseController.createExpense);
router.get('/', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), expenseController.getExpenses);
router.put('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), expenseController.updateExpense);
router.delete('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), expenseController.deleteExpense);
router.get('/export/pdf', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), expenseController.exportExpensesPDF);

module.exports = router;