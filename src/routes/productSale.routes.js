// backend/src/routes/productSale.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const productSaleController = require('../controllers/productSale.controller');

const SELLER_ROLES = [
  'SUPER_ADMIN', 'ADDITIONAL_DIRECTOR',
  'STATE_DEVELOPMENT_COORDINATOR', 'DISTRICT_BRANCH_MANAGER',
  'DISTRICT_PRESIDENT', 'DISTRICT_FIELD_COORDINATOR',
  'BLOCK_DEVELOPMENT_COORDINATOR', 'GRAM_DEVELOPMENT_COORDINATOR',
];

router.get('/sellable', protect, restrictTo(...SELLER_ROLES), productSaleController.getSellableProducts);
router.post('/sell', protect, restrictTo(...SELLER_ROLES), productSaleController.sellProduct);
router.post('/verify-sale', protect, restrictTo(...SELLER_ROLES), productSaleController.verifySalePayment); // 🆕
router.get('/my-sales', protect, restrictTo(...SELLER_ROLES), productSaleController.getMySales);
router.get('/my-purchases', protect, productSaleController.getMyPurchases);
router.get('/all-sales', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), productSaleController.getAllSales);

module.exports = router;