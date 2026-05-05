const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicine.controller');
const { protect, authorize } = require('../middleware');

// Public (authenticated) – catalogue
router.get('/', protect, medicineController.getMedicines);
router.get('/search', protect, medicineController.searchMedicines);
router.get('/:id', protect, medicineController.getMedicineById);

// Admin management
router.post('/', protect, authorize('SUPER_ADMIN'), medicineController.addMedicine);
router.put('/:id', protect, authorize('SUPER_ADMIN'), medicineController.updateMedicine);
router.delete('/:id', protect, authorize('SUPER_ADMIN'), medicineController.deleteMedicine);
router.patch('/:id/stock', protect, authorize('SUPER_ADMIN'), medicineController.updateStock);

// Orders
// Orders
router.post('/order', protect, medicineController.createOrder);
router.get('/orders/my', protect, medicineController.getMyOrders);
router.get('/orders/all', protect, authorize('SUPER_ADMIN'), medicineController.getAllOrders); // ⬅️ pahle
router.get('/orders/:id', protect, medicineController.getOrderById);
router.patch('/orders/:id/status', protect, authorize('SUPER_ADMIN'), medicineController.updateOrderStatus);
module.exports = router;