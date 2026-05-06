const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicine.controller');
const { protect, restrictTo } = require('../middleware'); // ✅ changed authorize → restrictTo

// Public catalogue (authenticated)
router.get('/', protect, medicineController.getMedicines);
router.get('/search', protect, medicineController.searchMedicines);
router.get('/orders/my', protect, medicineController.getMyOrders);
router.get('/orders/all', protect, restrictTo('SUPER_ADMIN'), medicineController.getAllOrders);
router.get('/orders/:id', protect, medicineController.getOrderById);
router.get('/:id', protect, medicineController.getMedicineById);

// Admin management
router.post('/', protect, restrictTo('SUPER_ADMIN'), medicineController.addMedicine);
router.put('/:id', protect, restrictTo('SUPER_ADMIN'), medicineController.updateMedicine);
router.delete('/:id', protect, restrictTo('SUPER_ADMIN'), medicineController.deleteMedicine);
router.patch('/:id/stock', protect, restrictTo('SUPER_ADMIN'), medicineController.updateStock);

// Orders
router.post('/order', protect, medicineController.createOrder);
router.patch('/orders/:id/status', protect, restrictTo('SUPER_ADMIN'), medicineController.updateOrderStatus);

module.exports = router;