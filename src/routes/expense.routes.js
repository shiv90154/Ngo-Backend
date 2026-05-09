// backend/src/routes/expense.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const scopeFilter = require('../middleware/scopeFilter');
const Expense = require('../models/Expense');
const asyncHandler = require('express-async-handler');

const NGO_ROLES = ['SUPER_ADMIN', 'ADDITIONAL_DIRECTOR', 'STATE_DEVELOPMENT_COORDINATOR', 'DISTRICT_BRANCH_MANAGER', 'DISTRICT_PRESIDENT', 'DISTRICT_FIELD_COORDINATOR', 'BLOCK_DEVELOPMENT_COORDINATOR', 'GRAM_DEVELOPMENT_COORDINATOR'];

router.use(protect);
router.use(scopeFilter);

router.get('/', restrictTo(...NGO_ROLES), asyncHandler(async (req, res) => {
  const filter = { ...req.scopeFilter };
  const expenses = await Expense.find(filter).sort('-date').populate('createdBy', 'fullName');
  res.json({ success: true, expenses });
}));

router.post('/', restrictTo(...NGO_ROLES), asyncHandler(async (req, res) => {
  const { category, amount, description, date } = req.body;
  const expense = await Expense.create({
    category,
    amount,
    description,
    date,
    state: req.user.state,
    district: req.user.district,
    block: req.user.block,
    village: req.user.village,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, expense });
}));

module.exports = router;