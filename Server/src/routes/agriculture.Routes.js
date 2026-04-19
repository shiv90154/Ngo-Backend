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

//------------------MANDI PRICES----------------

const MANDI_API_KEY = "579b464db66ec23bdd0000014b99536624ca49184e6d9ef5a2643829"
const MANDI_BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

router.get("/mandi", protect, async (req, res) => {
    try {
        const { state, district, market, commodity } = req.query;

        // Build filters for data.gov.in API
        const params = new URLSearchParams({
            "api-key": MANDI_API_KEY,
            format: "json",
            limit: "100",
        });

        if (state) params.append("filters[state]", state);
        if (district) params.append("filters[district]", district);
        if (market) params.append("filters[market]", market);
        if (commodity) params.append("filters[commodity]", commodity);

        const url = `${MANDI_BASE_URL}?${params.toString()}`;

        const response = await axios.get(url, { timeout: 10000 });

        // Forward the records to the client
        res.status(200).json({
            success: true,
            records: response.data.records || [],
            total: response.data.total || 0,
        });
    } catch (error) {
        console.error("Mandi API proxy error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch mandi prices",
            error: error.message,
        });
    }
});

router.route('/crops/:id')
    .get(getRecordById)
    .put(updateRecord)
    .delete(deleteRecord);

// ---------------- AGRICULTURE BUSINESS LOGIC ----------------
router.get('/yield-summary', getYieldSummary);
router.get('/tasks/upcoming', getUpcomingTasks);
router.post('/sensor-data', recordSensorData);

module.exports = router;