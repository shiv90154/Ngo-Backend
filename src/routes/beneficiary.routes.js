const express = require('express');
const router = express.Router();
const beneficiaryController = require('../controllers/beneficiary.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Admin routes
router.get('/', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), beneficiaryController.getBeneficiaries);
router.post('/', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), beneficiaryController.createBeneficiary);
router.put('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), beneficiaryController.updateBeneficiary);
router.delete('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), beneficiaryController.deleteBeneficiary);
router.get('/export/csv', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), beneficiaryController.exportBeneficiariesCSV);

module.exports = router;