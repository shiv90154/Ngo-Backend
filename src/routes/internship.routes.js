const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const scopeFilter = require('../middleware/scopeFilter');
const {
  getAllInternships,
  createInternship,
  updateInternship,
  deleteInternship,
} = require('../controllers/internship.controller');

const NGO_ROLES = [
  'SUPER_ADMIN',
  'ADDITIONAL_DIRECTOR',
  'STATE_DEVELOPMENT_COORDINATOR',
  'DISTRICT_BRANCH_MANAGER',
  'DISTRICT_PRESIDENT',
  'DISTRICT_FIELD_COORDINATOR',
  'BLOCK_DEVELOPMENT_COORDINATOR',
  'GRAM_DEVELOPMENT_COORDINATOR',
];

router.use(protect);
router.use(scopeFilter);   // हर रिक्वेस्ट पर req.scopeFilter सेट करेगा

router.get('/all', restrictTo(...NGO_ROLES), getAllInternships);
router.post('/', restrictTo(...NGO_ROLES), createInternship);
router.put('/:id', restrictTo(...NGO_ROLES), updateInternship);
router.delete('/:id', restrictTo(...NGO_ROLES), deleteInternship);

module.exports = router;