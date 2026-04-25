const mongoose = require('mongoose');
const Product = require('../models/Product.model');
const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const User = require('../models/user.model');
const CustomerAddress = require("../models/CustomerAddresses");
const axios = require('axios');
require('dotenv').config();

const PRIVILEGED_ROLES = [
    'SUPER_ADMIN',
    'ADDITIONAL_DIRECTOR',
    'STATE_OFFICER',
    'DISTRICT_MANAGER',
    'DISTRICT_PRESIDENT',
    'FIELD_OFFICER',
    'BLOCK_OFFICER',
    'VILLAGE_OFFICER'
];
const MANDI_API_KEY = "579b464db66ec23bdd0000014b99536624ca49184e6d9ef5a2643829"
const MANDI_BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

const hasAgricultureModule = (user) =>
    Array.isArray(user?.modules) && user.modules.includes('AGRICULTURE');

const isSellerUser = (user) =>
    !!(
        user &&
        (
            user?.sellerProfile?.isSeller ||
            user?.farmerProfile?.isContractFarmer ||
            PRIVILEGED_ROLES.includes(user.role) ||
            hasAgricultureModule(user)
        )
    );

const isAgricultureUser = (user) =>
    !!(user && (hasAgricultureModule(user) || PRIVILEGED_ROLES.includes(user.role) || user.role === 'USER'));

const ensureSellerAccess = (req, res) => {
    if (!isSellerUser(req.user)) {
        res.status(403).json({
            success: false,
            message: 'Access denied. Seller access required.'
        });
        return false;
    }
    return true;
};

const formatUserDisplayName = (user, fallback = 'Unknown User') =>
    user?.fullName || fallback;

const formatLocation = (user) => {
    if (!user) return '';
    const parts = [user.village, user.block, user.district, user.state, user.pincode].filter(Boolean);
    return parts.join(', ');
};

// ------------------- BUYER & CONTRACTOR (shared) -------------------

// @desc    Get all products
// @route   GET /agriculture/products
const getAllProducts = async (req, res, next) => {
    try {
        const { category, minPrice, maxPrice, location, page = 1, limit = 20 } = req.query;
        const filter = {
            isAvailable: true
        };

        // Keep approval filter only if your Product schema supports it
        if (Product.schema.path('approvalStatus')) {
            filter.approvalStatus = 'approved';
        }

        if (category) filter.category = category;

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        if (location) {
            filter.location = { $regex: location, $options: 'i' };
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('seller', 'fullName');

        const total = await Product.countDocuments(filter);

        const data = products.map(product => ({
            id: product._id,
            name: product.name,
            category: product.category,
            price: product.price,
            unit: product.unit,
            quantity: product.quantity,
            imageUrl: product.imageUrl || product.images?.[0] || '',
            sellerName: formatUserDisplayName(product.seller, 'Unknown Seller'),
            rating: product.rating || 4.5,
            location: product.location || '',
            isOrganic: !!product.isOrganic
        }));

        res.status(200).json({
            success: true,
            data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single product by ID
// @route   GET /agriculture/products/:id
const getProductById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }

        const product = await Product.findById(req.params.id).populate('seller', 'fullName');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const data = {
            id: product._id,
            title: product.name,
            description: product.description || '',
            price: product.price,
            unit: product.unit,
            quantity_available: product.quantity,
            images: product.images || (product.imageUrl ? [product.imageUrl] : []),
            seller_name: formatUserDisplayName(product.seller, 'Unknown Seller'),
            rating: product.rating || 4.5,
            location: product.location || '',
            category: product.category
        };

        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// @desc    Search products by keyword
// @route   GET /agriculture/search?q=...
const searchProducts = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ success: false, message: 'Search query required' });
        }

        const filter = {
            $text: { $search: q },
            isAvailable: true
        };

        if (Product.schema.path('approvalStatus')) {
            filter.approvalStatus = 'approved';
        }

        const products = await Product.find(filter).limit(30);

        res.status(200).json({ success: true, data: products });
    } catch (error) {
        next(error);
    }
};

// @desc    Get products by contractor/seller
// @route   GET /agriculture/contractor/:contractorId/products
const getContractorProducts = async (req, res, next) => {
    try {
        const filter = {
            seller: req.params.contractorId,
            isAvailable: true
        };

        if (Product.schema.path('approvalStatus')) {
            filter.approvalStatus = 'approved';
        }

        const products = await Product.find(filter);

        res.status(200).json({ success: true, data: products });
    } catch (error) {
        next(error);
    }
};

// ------------------- BUYER ONLY -------------------

// @desc    Place an order
// @route   POST /agriculture/orders
const createOrder = async (req, res, next) => {
    try {
        if (!isAgricultureUser(req.user)) {
            return res.status(403).json({ success: false, message: 'Only agriculture users can place orders' });
        }

        const { productId, quantity, deliveryAddress } = req.body;
        const product = await Product.findById(productId);

        if (!product || !product.isAvailable) {
            return res.status(400).json({ success: false, message: 'Product not available' });
        }

        if (Product.schema.path('approvalStatus') && product.approvalStatus !== 'approved') {
            return res.status(400).json({ success: false, message: 'Product not approved for sale' });
        }

        const order = await Order.create({
            buyer: req.user.id,
            seller: product.seller,
            product: productId,
            quantity,
            totalPrice: product.price * quantity,
            deliveryAddress
        });

        res.status(201).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

// @desc    Get buyer order history
// @route   GET /agriculture/my-orders
const getMyOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ buyer: req.user.id })
            .populate({
                path: 'product',
                select: 'name price images imageUrl' // include both fields if needed
            })
            .sort({ createdAt: -1 });

        // Transform each order to match frontend expectations
        const sanitizedOrders = orders.map(order => {
            const orderObj = order.toObject();

            // Ensure product.images is an array (convert imageUrl if present)
            if (orderObj.product) {
                if (!orderObj.product.images && orderObj.product.imageUrl) {
                    orderObj.product.images = [orderObj.product.imageUrl];
                } else if (!orderObj.product.images) {
                    orderObj.product.images = [];
                }
            } else {
                // Fallback if product is missing (deleted)
                orderObj.product = {
                    name: 'Product unavailable',
                    price: 0,
                    images: []
                };
            }

            return orderObj;
        });

        res.status(200).json({ success: true, data: sanitizedOrders });
    } catch (error) {
        next(error);
    }
};
// ------------------- SELLER MODULE -------------------

// @desc    Get seller dashboard
// @route   GET /agriculture/seller/dashboard
const getSellerDashboard = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const sellerId = req.user.id;

        const pendingFilter = Product.schema.path('approvalStatus')
            ? { seller: sellerId, approvalStatus: 'pending' }
            : { seller: sellerId, isAvailable: false };

        const [
            totalProducts,
            activeProducts,
            pendingProducts,
            lowStockProducts,
            totalOrders,
            recentProducts,
            recentOrders,
            revenueAgg
        ] = await Promise.all([
            Product.countDocuments({ seller: sellerId }),
            Product.countDocuments({ seller: sellerId, isAvailable: true }),
            Product.countDocuments(pendingFilter),
            Product.countDocuments({ seller: sellerId, quantity: { $lte: 5 } }),
            Order.countDocuments({ seller: sellerId }),
            Product.find({ seller: sellerId }).sort({ createdAt: -1 }).limit(5),
            Order.find({ seller: sellerId })
                .populate('buyer', 'fullName')
                .sort({ createdAt: -1 })
                .limit(5),
            Order.aggregate([
                {
                    $match: {
                        seller: new mongoose.Types.ObjectId(String(sellerId))
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalPrice' }
                    }
                }
            ])
        ]);

        const monthlyRevenue = revenueAgg[0]?.total || 0;

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalProducts,
                    activeProducts,
                    pendingProducts,
                    lowStockProducts,
                    totalOrders,
                    monthlyRevenue
                },
                recentProducts: recentProducts.map(product => ({
                    id: product._id,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    unit: product.unit,
                    quantity: product.quantity,
                    imageUrl: product.imageUrl || product.images?.[0] || '',
                    approvalStatus: product.approvalStatus || 'approved',
                    status: product.isAvailable ? 'active' : 'inactive'
                })),
                recentOrders: recentOrders.map(order => ({
                    id: order._id,
                    buyerName: formatUserDisplayName(order.buyer, 'Buyer'),
                    total: order.totalPrice,
                    status: order.status || 'processing',
                    createdAt: order.createdAt
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get seller products
// @route   GET /agriculture/seller/products
const getSellerProducts = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const { page = 1, limit = 10 } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const filter = { seller: req.user.id };

        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const totalItems = await Product.countDocuments(filter);

        const items = products.map(product => ({
            id: product._id,
            name: product.name,
            category: product.category,
            price: product.price,
            quantity: product.quantity,
            unit: product.unit,
            location: product.location || '',
            imageUrl: product.imageUrl || product.images?.[0] || '',
            isOrganic: !!product.isOrganic,
            approvalStatus: product.approvalStatus || 'approved',
            status: product.isAvailable ? 'active' : 'inactive',
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        }));

        res.status(200).json({
            success: true,
            data: {
                items,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limitNum)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get seller product by ID
// @route   GET /agriculture/seller/products/:id
const getSellerProductById = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }

        const product = await Product.findOne({
            _id: req.params.id,
            seller: req.user.id
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                id: product._id,
                name: product.name,
                description: product.description || '',
                category: product.category,
                price: product.price,
                quantity: product.quantity,
                unit: product.unit,
                location: product.location || '',
                imageUrl: product.imageUrl || product.images?.[0] || '',
                images: product.images || (product.imageUrl ? [product.imageUrl] : []),
                isOrganic: !!product.isOrganic,
                approvalStatus: product.approvalStatus || 'approved',
                status: product.isAvailable ? 'active' : 'inactive',
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create seller product
// @route   POST /agriculture/seller/products
const createSellerProduct = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const payload = {
            ...req.body,
            seller: req.user.id,
            isAvailable: true
        };

        if (Product.schema.path('approvalStatus')) {
            payload.approvalStatus = 'pending';
        }

        const product = await Product.create(payload);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: {
                id: product._id,
                name: product.name,
                category: product.category,
                price: product.price,
                quantity: product.quantity,
                unit: product.unit,
                location: product.location || '',
                imageUrl: product.imageUrl || product.images?.[0] || '',
                isOrganic: !!product.isOrganic,
                approvalStatus: product.approvalStatus || 'approved',
                status: product.isAvailable ? 'active' : 'inactive',
                createdAt: product.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update seller product
// @route   PUT /agriculture/seller/products/:id
const updateSellerProduct = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const product = await Product.findOne({
            _id: req.params.id,
            seller: req.user.id
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        Object.assign(product, req.body);

        if (Product.schema.path('approvalStatus')) {
            product.approvalStatus = 'pending';
        }

        await product.save();

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: {
                id: product._id,
                name: product.name,
                category: product.category,
                price: product.price,
                quantity: product.quantity,
                unit: product.unit,
                location: product.location || '',
                imageUrl: product.imageUrl || product.images?.[0] || '',
                isOrganic: !!product.isOrganic,
                approvalStatus: product.approvalStatus || 'approved',
                status: product.isAvailable ? 'active' : 'inactive',
                updatedAt: product.updatedAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete seller product
// @route   DELETE /agriculture/seller/products/:id
const deleteSellerProduct = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const product = await Product.findOneAndDelete({
            _id: req.params.id,
            seller: req.user.id
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// ------------------- LEGACY PRODUCT HANDLERS -------------------

// @desc    Create a new product listing
// @route   POST /agriculture/products
const createProduct = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        req.body.seller = req.user.id;

        if (Product.schema.path('approvalStatus') && req.body.approvalStatus === undefined) {
            req.body.approvalStatus = 'pending';
        }

        const newProduct = await Product.create(req.body);

        res.status(201).json({ success: true, data: newProduct });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a product
// @route   PUT /agriculture/products/:id
const updateProduct = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only update your own products' });
        }

        const payload = { ...req.body };
        if (Product.schema.path('approvalStatus')) {
            payload.approvalStatus = 'pending';
        }

        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a product
// @route   DELETE /agriculture/products/:id
const deleteProduct = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only delete your own products' });
        }

        await product.deleteOne();

        res.status(200).json({ success: true, message: 'Product removed' });
    } catch (error) {
        next(error);
    }
};

// ------------------- CART FUNCTIONS -------------------

const getCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id }).populate({
            path: 'items.product',
            select: 'name price images imageUrl unit'
        });

        if (!cart) {
            return res.status(200).json({ success: true, data: [] });
        }

        const data = cart.items.map(item => ({
            productId: item.product._id,
            name: item.product.name,
            price: item.price,
            quantity: item.quantity,
            product: {
                imageUrl: item.product.imageUrl || item.product.images?.[0] || '',
                unit: item.product.unit
            }
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const addToCart = async (req, res, next) => {
    try {
        const { productId, quantity, price } = req.body;

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
        }

        const existingItem = cart.items.find(item => item.product.toString() === productId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity, price });
        }

        await cart.save();

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

const updateCartItem = async (req, res, next) => {
    try {
        const { quantity } = req.body;
        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.find(item => item.product.toString() === req.params.productId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not in cart' });
        }

        if (quantity <= 0) {
            cart.items = cart.items.filter(item => item.product.toString() !== req.params.productId);
        } else {
            item.quantity = quantity;
        }

        await cart.save();

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

const removeCartItem = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item.product.toString() !== req.params.productId);
        await cart.save();

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

const checkout = async (req, res, next) => {
    try {
        const { deliveryAddress } = req.body;
        if (!deliveryAddress || !deliveryAddress.city || !deliveryAddress.block) {
            return res.status(400).json({
                success: false,
                message: 'Complete delivery address (city & block) is required'
            });
        }
        const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        for (const item of cart.items) {
            const product = item.product;
            if (!product) {
                return res.status(400).json({ success: false, message: 'Product not found in cart' });
            }
            if (product.quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}. Only ${product.quantity} left.`
                });
            }
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            for (const item of cart.items) {
                await Order.create([{
                    buyer: req.user.id,
                    seller: item.product.seller,
                    product: item.product._id,
                    quantity: item.quantity,
                    totalPrice: item.price * item.quantity,
                    deliveryAddress,
                    orderStatus: 'pending',
                    paymentStatus: 'pending'
                }], { session });
            }
            for (const item of cart.items) {
                await Product.updateOne(
                    { _id: item.product._id, quantity: { $gte: item.quantity } },
                    { $inc: { quantity: -item.quantity } },
                    { session }
                );
            }

            cart.items = [];
            await cart.save({ session });

            await session.commitTransaction();
            res.status(200).json({ success: true });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error) {
        next(error);
    }
};
// ------------------- LEGACY MY PRODUCTS -------------------

const getMyProducts = async (req, res, next) => {
    try {
        const products = await Product.find({ seller: req.user.id });

        const data = products.map(product => ({
            _id: product._id,
            productName: product.name,
            category: product.category,
            quantityAvailable: product.quantity,
            unit: product.unit,
            pricePerUnit: product.price,
            status: product.isAvailable ? 'active' : 'inactive'
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const createMyProduct = async (req, res, next) => {
    try {
        const { productName, category, quantityAvailable, unit, pricePerUnit } = req.body;

        const payload = {
            name: productName,
            category,
            quantity: quantityAvailable,
            unit,
            price: pricePerUnit,
            seller: req.user.id
        };

        if (Product.schema.path('approvalStatus')) {
            payload.approvalStatus = 'pending';
        }

        await Product.create(payload);

        res.status(201).json({ success: true });
    } catch (error) {
        next(error);
    }
};

const updateMyProduct = async (req, res, next) => {
    try {
        const { productName, category, quantityAvailable, unit, pricePerUnit } = req.body;

        const payload = {
            name: productName,
            category,
            quantity: quantityAvailable,
            unit,
            price: pricePerUnit
        };

        if (Product.schema.path('approvalStatus')) {
            payload.approvalStatus = 'pending';
        }

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, seller: req.user.id },
            payload,
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

const deleteMyProduct = async (req, res, next) => {
    try {
        const product = await Product.findOneAndDelete({ _id: req.params.id, seller: req.user.id });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

// ------------------- PLACEHOLDERS -------------------

const getYieldSummary = async (req, res, next) => {
    res.status(200).json({ success: true, message: 'Yield summary not implemented' });
};

const getUpcomingTasks = async (req, res, next) => {
    res.status(200).json({ success: true, message: 'Upcoming tasks not implemented' });
};

const recordSensorData = async (req, res, next) => {
    res.status(200).json({ success: true, message: 'Sensor data recorded' });
};

// ------------------- GENERAL DASHBOARD -------------------

const getDashboard = async (req, res, next) => {
    try {
        const myProducts = await Product.countDocuments({ seller: req.user.id });
        const totalOrders = await Order.countDocuments({
            $or: [{ buyer: req.user.id }, { seller: req.user.id }]
        });

        const stats = {
            totalProducts: myProducts,
            totalOrders,
            role: req.user.role,
            modules: req.user.modules || [],
        };

        res.status(200).json({ success: true, data: { stats } });
    } catch (error) {
        next(error);
    }
};

// ------------------- PROFILE -------------------

const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const data = {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            phone: user.phone || '',
            state: user.state || '',
            district: user.district || '',
            block: user.block || '',
            village: user.village || '',
            pincode: user.pincode || '',
            fullAddress: user.fullAddress || '',
            location: formatLocation(user),
            modules: user.modules || [],
            farmerProfile: user.farmerProfile || {},
            sellerProfile: user.sellerProfile || {}
        };

        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// ------------------- TEST / DEV -------------------

const testAddProduct = async (req, res, next) => {
    try {
        let dummyDealer = await User.findOne({
            $or: [
                { 'sellerProfile.isSeller': true },
                { 'farmerProfile.isContractFarmer': true }
            ]
        });

        if (!dummyDealer) {
            dummyDealer = await User.create({
                fullName: 'Test Dealer',
                email: 'dealer@test.com',
                phone: '9999999991',
                password: 'password123',
                role: 'USER',
                modules: ['AGRICULTURE'],
                sellerProfile: {
                    isSeller: true,
                    storeName: 'Test Agri Store'
                },
                isVerified: true
            });
        }

        req.body.seller = dummyDealer._id;

        if (!req.body.name) req.body.name = 'Test Product ' + Math.floor(Math.random() * 100);
        if (!req.body.price) req.body.price = 100;
        if (!req.body.category) req.body.category = 'seeds';
        if (req.body.isAvailable === undefined) req.body.isAvailable = true;
        if (Product.schema.path('approvalStatus') && req.body.approvalStatus === undefined) {
            req.body.approvalStatus = 'approved';
        }

        const newProduct = await Product.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Test product added',
            data: newProduct
        });
    } catch (error) {
        next(error);
    }
};

// --------- GET ADDRESSES OF USER--------------

const getUserAddresses = async (req, res, next) => {
    try {
        const addresses = await CustomerAddress.find({
            user: req.user.id
        }).sort({ isDefault: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: addresses
        });

    } catch (error) {
        next(error);
    }
};
// --------------MANDI API -------------------
const getMandiPrices = async (req, res) => {
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
};

const getSellerOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;

        // Find all orders that contain at least one item from this seller
        const orders = await Order.find({
            "items.seller": sellerId
        })
            .populate("items.product", "name price images")
            .populate("buyer", "name email")
            .sort({ createdAt: -1 });

        // Transform each order: only keep items belonging to this seller
        const sanitizedOrders = orders.map(order => {
            const sellerItems = order.items.filter(
                item => item.seller.toString() === sellerId
            );
            return {
                id: order._id,
                buyerName: order.buyer?.name || "Customer",
                createdAt: order.createdAt,
                status: order.status, // optional: per‑order status
                items: sellerItems,
                total: sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            };
        });

        // Also compute stats for dashboard
        const stats = {
            totalOrders: sanitizedOrders.length,
            activeProducts: await Product.countDocuments({ seller: sellerId, status: "active" }),
            monthlyRevenue: await Order.aggregate([
                { $unwind: "$items" },
                { $match: { "items.seller": sellerId, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
                { $group: { _id: null, total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } }
            ]).then(res => res[0]?.total || 0)
        };

        res.json({
            success: true,
            data: {
                recentOrders: sanitizedOrders.slice(0, 10), // last 10 orders
                stats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    // Shared
    getAllProducts,
    getProductById,
    searchProducts,
    getContractorProducts,

    // Orders
    createOrder,
    getMyOrders,

    // Seller module
    getSellerDashboard,
    getSellerProducts,
    getSellerProductById,
    createSellerProduct,
    updateSellerProduct,
    deleteSellerProduct,

    // Legacy posting
    createProduct,
    updateProduct,
    deleteProduct,

    // Cart
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    checkout,

    // Legacy my-products
    getMyProducts,
    createMyProduct,
    updateMyProduct,
    deleteMyProduct,


    // Dashboard & Profile
    getDashboard,
    getProfile,

    // Test
    testAddProduct,
    getUserAddresses,
    getMandiPrices,
    // Seller orders
    getSellerOrders
};