const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const beneficiaryController = require('../controllers/beneficiary.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

// Apply scopeFilter middleware to all routes (if not already global)
router.use(protect);
router.use(restrictTo(...ALLOWED));

// Order matters: static routes before :id
router.get('/export/csv', beneficiaryController.exportBeneficiariesCSV);
router.get('/', beneficiaryController.getBeneficiaries);
router.post('/', beneficiaryController.createBeneficiary);
router.put('/:id', beneficiaryController.updateBeneficiary);
router.delete('/:id', beneficiaryController.deleteBeneficiary);

module.exports = router;