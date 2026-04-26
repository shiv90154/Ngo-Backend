const express = require('express');
const axios = require('axios');
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
    getUserAddresses,
    createUserAddress,
    // Seller module
    getSellerDashboard,
    getSellerProducts,
    getSellerProductById,
    createSellerProduct,
    updateSellerProduct,
    deleteSellerProduct,

    // Test
    testAddProduct,
    getSellerOrders,
    getMandiPrices
} = require('../controllers/agricultureController');

const { protect } = require('../middleware/auth.middleware');

// ---------------- PUBLIC ----------------
router.get('/products', getAllProducts);
router.get('/products/:id', getProductById);
router.get('/search', searchProducts);

router.post('/test-add-product', testAddProduct);

// ---------------- PROTECTED ----------------
router.use(protect);

// Dashboard & Profile
router.get('/dashboard', getDashboard);
router.route('/profile')
    .get(getProfile)

// Orders
router.post('/orders', createOrder);
router.get('/my-orders', getMyOrders);

//Address
router.get('/addresses', getUserAddresses);
router.post('/addresses', createUserAddress);
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

router.route("/seller/orders")
    .get(getSellerOrders);

// ---------------- LEGACY DEALER ROUTES ----------------
router.route('/my-products')
    .get(getMyProducts)
    .post(createMyProduct);

router.route('/my-products/:id')
    .put(updateMyProduct)
    .delete(deleteMyProduct);


//------------------MANDI PRICES----------------

router.get("/mandi", getMandiPrices);
// ---------------- AGRICULTURE BUSINESS LOGIC ----------------
// router.get('/tasks/upcoming', getUpcomingTasks);
// router.post('/sensor-data', recordSensorData);

module.exports = router;