const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contract.controller');
const { protect, authorize } = require('../middleware');

// User routes
router.get('/my', protect, contractController.getMyContract);
router.put('/my', protect, contractController.uploadReceipt, contractController.updateMyContract);

// Admin routes
router.get('/all', protect, authorize('SUPER_ADMIN','ADDITIONAL_DIRECTOR'), contractController.getAllContracts);
router.patch('/:id/review', protect, authorize('SUPER_ADMIN','ADDITIONAL_DIRECTOR'), contractController.reviewContract);

module.exports = router;