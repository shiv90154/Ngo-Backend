const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const beneficiaryController = require('../controllers/beneficiary.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

router.get('/', protect, restrictTo(...ALLOWED), beneficiaryController.getBeneficiaries);
router.post('/', protect, restrictTo(...ALLOWED), beneficiaryController.createBeneficiary);
router.put('/:id', protect, restrictTo(...ALLOWED), beneficiaryController.updateBeneficiary);
router.delete('/:id', protect, restrictTo(...ALLOWED), beneficiaryController.deleteBeneficiary);
router.get('/export/csv', protect, restrictTo(...ALLOWED), beneficiaryController.exportBeneficiariesCSV);

module.exports = router;