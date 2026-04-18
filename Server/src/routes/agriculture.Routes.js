const express = require('express');
const router = express.Router();
const {
    getAllRecords,
    getRecordById,
    createRecord,
    updateRecord,
    deleteRecord,
    getYieldSummary,
    getUpcomingTasks,
    recordSensorData,

    // Marketplace
    getAllProducts,
    getProductById,
    searchProducts,

    // Orders
    createOrder,
    getMyOrders,

    // Cart
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    checkout,

    // Dealer / legacy
    getMyProducts,
    createMyProduct,
    updateMyProduct,
    deleteMyProduct,

    // Dashboard & Profile
    getDashboard,
    getProfile,
    updateProfile,

    // Seller module
    getSellerDashboard,
    getSellerProducts,
    getSellerProductById,
    createSellerProduct,
    updateSellerProduct,
    deleteSellerProduct,

    // Test
    testAddProduct,
    testAddCrop
} = require('../controllers/agricultureController');

const { protect } = require('../middleware/auth.middleware');

// ---------------- PUBLIC ----------------
router.get('/products', getAllProducts);
router.get('/products/:id', getProductById);
router.get('/search', searchProducts);

router.post('/test-add-product', testAddProduct);
router.post('/test-add-crop', testAddCrop);

// ---------------- PROTECTED ----------------
router.use(protect);

// Dashboard & Profile
router.get('/dashboard', getDashboard);
router.route('/profile')
    .get(getProfile)
    .put(updateProfile);

// Orders
router.post('/orders', createOrder);
router.get('/my-orders', getMyOrders);

// Cart
router.route('/cart')
    .get(getCart)
    .post(addToCart);

router.route('/cart/:productId')
    .put(updateCartItem)
    .delete(removeCartItem);

router.post('/checkout', checkout);

// ---------------- SELLER MODULE ----------------
router.get('/seller/dashboard', getSellerDashboard);

router.route('/seller/products')
    .get(getSellerProducts)
    .post(createSellerProduct);

router.route('/seller/products/:id')
    .get(getSellerProductById)
    .put(updateSellerProduct)
    .delete(deleteSellerProduct);

// ---------------- LEGACY DEALER ROUTES ----------------
router.route('/my-products')
    .get(getMyProducts)
    .post(createMyProduct);

router.route('/my-products/:id')
    .put(updateMyProduct)
    .delete(deleteMyProduct);

// ---------------- CROP MANAGEMENT ----------------
router.route('/crops')
    .get(getAllRecords)
    .post(createRecord);

router.route('/crops/:id')
    .get(getRecordById)
    .put(updateRecord)
    .delete(deleteRecord);

// ---------------- AGRICULTURE BUSINESS LOGIC ----------------
router.get('/yield-summary', getYieldSummary);
router.get('/tasks/upcoming', getUpcomingTasks);
router.post('/sensor-data', recordSensorData);

module.exports = router;