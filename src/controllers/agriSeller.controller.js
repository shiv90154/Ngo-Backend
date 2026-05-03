const mongoose = require('mongoose');
const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const User = require('../models/user.model');

// ==================== HELPER FUNCTIONS ====================

const ensureSellerAccess = (req, res) => {
    if (!req.user || !req.user.farmerProfile?.isContractFarmer) {
        res.status(403).json({
            success: false,
            message: 'Access denied. Contract farmer access required.'
        });
        return false;
    }
    return true;
};

const formatUserDisplayName = (user, defaultValue = 'User') => {
    if (!user) return defaultValue;
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return defaultValue;
};

/**
 * Calculate seller statistics from orders
 */
const calculateSellerStats = async (sellerId, sellerOrders) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let stats = {
        totalOrders: sellerOrders.length,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        monthlyRevenue: 0,
        monthlyOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0
    };

    for (const order of sellerOrders) {
        stats.totalRevenue += order.total;

        if (order.createdAt >= startOfMonth) {
            stats.monthlyOrders++;
            stats.monthlyRevenue += order.total;
        }

        switch (order.status) {
            case 'pending':
                stats.pendingOrders++;
                break;
            case 'confirmed':
            case 'processing':
                stats.processingOrders++;
                break;
            case 'shipped':
                stats.shippedOrders++;
                break;
            case 'delivered':
                stats.deliveredOrders++;
                break;
            case 'cancelled':
                stats.cancelledOrders++;
                break;
        }
    }

    stats.averageOrderValue = stats.totalOrders > 0 ?
        stats.totalRevenue / stats.totalOrders : 0;

    return stats;
};

/**
 * Get status update message
 */
const getStatusMessage = (status) => {
    const messages = {
        'confirmed': 'Order has been confirmed',
        'processing': 'Order is now being processed',
        'shipped': 'Order has been shipped',
        'delivered': 'Order has been marked as delivered',
        'cancelled': 'Order has been cancelled'
    };
    return messages[status] || `Order status updated to ${status}`;
};

/**
 * Send notification to buyer
 */
const sendOrderStatusNotification = async (order, status) => {
    try {
        // Implement your notification logic here
        // Examples:
        // 1. Send email using nodemailer
        // 2. Send SMS using Twilio
        // 3. Send push notification
        // 4. Create notification in database

        console.log(`Notification sent for order ${order._id}: Status changed to ${status}`);

        // Example email structure:
        /*
        const buyer = await User.findById(order.buyer);
        await sendEmail({
            to: buyer.email,
            subject: `Order #${order._id} Status Update`,
            html: `
                <h2>Your order status has been updated!</h2>
                <p>Order ID: ${order._id}</p>
                <p>New Status: ${status}</p>
                ${order.trackingNumber ? `<p>Tracking Number: ${order.trackingNumber}</p>` : ''}
                <a href="${process.env.FRONTEND_URL}/orders/${order._id}">View Order</a>
            `
        });
        */

    } catch (error) {
        console.error('Failed to send notification:', error);
        // Don't throw error - notification failure shouldn't break the update
    }
};

/**
 * Generate invoice HTML
 */
const generateInvoiceHTML = (order, product, seller) => {
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN');
    const orderId = order.orderId || order._id.toString().slice(-8).toUpperCase();

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice #${orderId}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .company { color: #138808; font-size: 24px; font-weight: bold; }
                .invoice-title { font-size: 20px; margin-top: 10px; }
                .section { margin-bottom: 20px; }
                .section-title { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
                .info-row { display: flex; margin-bottom: 5px; }
                .info-label { width: 120px; font-weight: bold; }
                .info-value { flex: 1; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #f5f5f5; }
                .total-row { font-weight: bold; font-size: 18px; }
                .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company">KissanMitra</div>
                <div class="invoice-title">TAX INVOICE</div>
            </div>
            
            <div class="section">
                <div class="section-title">SELLER INFORMATION</div>
                <div class="info-row">
                    <div class="info-label">Business Name:</div>
                    <div class="info-value">${seller.farmerProfile?.farmName || seller.name}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Seller Name:</div>
                    <div class="info-value">${seller.name}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value">${seller.email}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Phone:</div>
                    <div class="info-value">${seller.phone || 'N/A'}</div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">BUYER INFORMATION</div>
                <div class="info-row">
                    <div class="info-label">Name:</div>
                    <div class="info-value">${order.buyer.name}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value">${order.buyer.email}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Phone:</div>
                    <div class="info-value">${order.buyer.phone || 'N/A'}</div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">ORDER DETAILS</div>
                <div class="info-row">
                    <div class="info-label">Order ID:</div>
                    <div class="info-value">${orderId}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Order Date:</div>
                    <div class="info-value">${orderDate}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Payment Method:</div>
                    <div class="info-value">${order.paymentMethod || 'Online'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Payment Status:</div>
                    <div class="info-value">${order.paymentStatus || 'Paid'}</div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">SHIPPING ADDRESS</div>
                <div class="info-value">
                    ${order.deliveryAddress.street}<br>
                    ${order.deliveryAddress.city}, ${order.deliveryAddress.state}<br>
                    Pincode: ${order.deliveryAddress.pincode}
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Sl No.</th>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price (₹)</th>
                        <th>Total (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>${product.name}</td>
                        <td>${order.quantity || 1}</td>
                        <td>₹${(order.price || product.price).toLocaleString('en-IN')}</td>
                        <td>₹${((order.quantity || 1) * (order.price || product.price)).toLocaleString('en-IN')}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" style="text-align: right;"><strong>Subtotal:</strong></td>
                        <td>₹${((order.quantity || 1) * (order.price || product.price)).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="text-align: right;"><strong>Shipping:</strong></td>
                        <td>₹${(order.shippingCost || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="4" style="text-align: right;"><strong>TOTAL:</strong></td>
                        <td>₹${(order.total || (order.quantity * order.price)).toLocaleString('en-IN')}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Thank you for shopping with KissanMitra!</p>
                <p>This is a computer generated invoice and does not require signature.</p>
            </div>
        </body>
        </html>
    `;
};

// ==================== SELLER DASHBOARD CONTROLLERS ====================

/**
 * @desc    Get seller dashboard basic stats
 * @route   GET /agriculture/seller/dashboard
 * @access  Private (Seller/Contract Farmer only)
 */
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

// ==================== ENHANCED SELLER ORDERS CONTROLLERS ====================

/**
 * @desc    Get all seller orders with full details
 * @route   GET /api/agriculture/seller/orders
 * @access  Private (Seller/Contract Farmer only)
 */
/**
 * @desc    Get all seller orders with full details
 * @route   GET /api/agriculture/seller/orders
 * @access  Private (Seller/Contract Farmer only)
 */
const getSellerOrders = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const sellerId = req.user.id;

        // OPTION 1: If orders have a direct 'seller' field (like in getSellerDashboard)
        const orders = await Order.find({ seller: sellerId })
            .populate({
                path: 'product',
                select: 'name price images imageUrl description'
            })
            .populate({
                path: 'buyer',
                select: 'name email phone profileImage'
            })
            .sort({ createdAt: -1 });

        // Transform orders
        const sellerOrders = [];

        for (const order of orders) {
            const sellerItems = [];
            let sellerSubtotal = 0;

            // Handle single product order (most common)
            if (order.product) {
                const product = order.product;
                sellerItems.push({
                    productId: product._id,
                    productName: product.name,
                    quantity: order.quantity || 1,
                    price: order.price || product.price,
                    image: product.images?.[0] || product.imageUrl,
                    unit: product.unit
                });
                sellerSubtotal = (order.quantity || 1) * (order.price || product.price);
            }

            // Handle cart orders with multiple items (if your order has items array)
            if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                // Clear previous single item if exists
                if (sellerItems.length > 0 && order.items.length > 1) {
                    sellerItems.length = 0;
                    sellerSubtotal = 0;
                }

                for (const item of order.items) {
                    // Check if item belongs to this seller
                    const product = await Product.findById(item.productId);
                    if (product && product.seller.toString() === sellerId) {
                        sellerItems.push({
                            productId: item.productId,
                            productName: item.productName,
                            quantity: item.quantity,
                            price: item.price,
                            image: item.image,
                            unit: item.unit
                        });
                        sellerSubtotal += item.quantity * item.price;
                    }
                }
            }

            // Only include orders that have seller's products
            if (sellerItems.length > 0) {
                // Calculate seller's portion of shipping (pro-rated)
                const sellerShipping = order.shippingCost ?
                    (sellerSubtotal / order.subtotal) * order.shippingCost : 0;

                sellerOrders.push({
                    _id: order._id,
                    orderId: order.orderId || order._id.toString().slice(-8).toUpperCase(),
                    buyer: order.buyer ? {
                        _id: order.buyer._id,
                        name: order.buyer.name,
                        email: order.buyer.email,
                        phone: order.buyer.phone
                    } : {
                        _id: order.buyerId,
                        name: 'Unknown Buyer',
                        email: '',
                        phone: ''
                    },
                    items: sellerItems,
                    deliveryAddress: order.deliveryAddress,
                    billingAddress: order.billingAddress || order.deliveryAddress,
                    status: order.orderStatus || order.status || 'pending',
                    paymentStatus: order.paymentStatus || 'pending',
                    paymentMethod: order.paymentMethod || 'online',
                    paymentId: order.paymentId,
                    subtotal: sellerSubtotal,
                    shippingCost: sellerShipping,
                    tax: order.tax || 0,
                    discount: order.discount || 0,
                    total: sellerSubtotal + sellerShipping,
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                    notes: order.notes || order.customerNotes,
                    sellerNotes: order.sellerNotes,
                    trackingNumber: order.trackingNumber,
                    trackingCompany: order.trackingCompany,
                    estimatedDelivery: order.estimatedDelivery,
                    deliveredAt: order.deliveredAt,
                    cancelledAt: order.cancelledAt,
                    cancellationReason: order.cancellationReason
                });
            }
        }

        res.status(200).json({
            success: true,
            data: {
                orders: sellerOrders,
                stats: await calculateSellerStats(req.user.id, sellerOrders)
            }
        });
    } catch (error) {
        console.error('Get seller orders error:', error);
        next(error);
    }
};

/**
 * @desc    Get seller order statistics
 * @route   GET /api/agriculture/seller/orders/stats
 * @access  Private
 */
const getSellerOrderStats = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const sellerProducts = await Product.find({ seller: req.user.id }).select('_id');
        const productIds = sellerProducts.map(p => p._id);

        const orders = await Order.find({
            'product': { $in: productIds }
        });

        let stats = {
            totalOrders: 0,
            pendingOrders: 0,
            processingOrders: 0,
            shippedOrders: 0,
            deliveredOrders: 0,
            cancelledOrders: 0,
            monthlyRevenue: 0,
            monthlyOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0
        };

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        for (const order of orders) {
            let orderTotal = 0;

            // Calculate seller's portion
            if (order.product && productIds.includes(order.product.toString())) {
                orderTotal = (order.quantity || 1) * (order.price || 0);
            }

            if (orderTotal > 0) {
                stats.totalOrders++;
                stats.totalRevenue += orderTotal;

                // Monthly stats
                if (order.createdAt >= startOfMonth) {
                    stats.monthlyOrders++;
                    stats.monthlyRevenue += orderTotal;
                }

                // Status counts
                const status = (order.orderStatus || order.status || '').toLowerCase();
                switch (status) {
                    case 'pending':
                        stats.pendingOrders++;
                        break;
                    case 'confirmed':
                    case 'processing':
                        stats.processingOrders++;
                        break;
                    case 'shipped':
                        stats.shippedOrders++;
                        break;
                    case 'delivered':
                        stats.deliveredOrders++;
                        break;
                    case 'cancelled':
                        stats.cancelledOrders++;
                        break;
                }
            }
        }

        stats.averageOrderValue = stats.totalOrders > 0 ?
            stats.totalRevenue / stats.totalOrders : 0;

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get seller order stats error:', error);
        next(error);
    }
};

/**
 * @desc    Update order status (Confirm, Process, Ship, Deliver, Cancel)
 * @route   PUT /api/agriculture/seller/orders/:orderId/status
 * @access  Private
 */
const updateOrderStatus = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const { orderId } = req.params;
        const { status, trackingNumber, trackingCompany, note, cancellationReason } = req.body;

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Verify seller owns the product in this order
        const product = await Product.findById(order.product);
        if (!product || product.seller.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to update this order'
            });
        }

        // Validate status transition
        const currentStatus = (order.orderStatus || order.status || 'pending').toLowerCase();
        const newStatus = status.toLowerCase();

        const validTransitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['processing', 'cancelled'],
            'processing': ['shipped', 'cancelled'],
            'shipped': ['delivered'],
            'delivered': [],
            'cancelled': []
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: `Cannot transition from ${currentStatus} to ${newStatus}`
            });
        }

        // Update order fields
        order.orderStatus = newStatus;
        order.status = newStatus;

        if (trackingNumber) {
            order.trackingNumber = trackingNumber;
        }
        if (trackingCompany) {
            order.trackingCompany = trackingCompany;
        }
        if (note) {
            order.sellerNotes = note;
        }

        // Add status-specific fields
        if (newStatus === 'delivered') {
            order.deliveredAt = new Date();
        }
        if (newStatus === 'cancelled') {
            order.cancelledAt = new Date();
            order.cancellationReason = cancellationReason || note;
        }

        order.updatedAt = new Date();

        await order.save({ validateBeforeSave: false });

        // Send notification to buyer
        await sendOrderStatusNotification(order, newStatus);

        const message = getStatusMessage(newStatus);

        res.status(200).json({
            success: true,
            message: message,
            data: {
                orderId: order._id,
                status: newStatus,
                trackingNumber: order.trackingNumber,
                updatedAt: order.updatedAt
            }
        });
    } catch (error) {
        console.error('Update order status error:', error);
        next(error);
    }
};

/**
 * @desc    Download order invoice
 * @route   GET /api/agriculture/seller/orders/:orderId/invoice
 * @access  Private
 */
const downloadInvoice = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const { orderId } = req.params;

        // Find order with populated data
        const order = await Order.findById(orderId)
            .populate('product')
            .populate('buyer', 'name email phone');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Verify seller owns the product
        const product = await Product.findById(order.product);
        if (!product || product.seller.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to download this invoice'
            });
        }

        // Get seller details
        const seller = await User.findById(req.user.id).select('name email phone farmerProfile');

        // Generate HTML invoice
        const invoiceHtml = generateInvoiceHTML(order, product, seller);

        // Generate PDF from HTML
        const pdf = require('html-pdf');
        pdf.create(invoiceHtml, {
            format: 'A4',
            border: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            }
        }).toBuffer((err, buffer) => {
            if (err) {
                console.error('PDF generation error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to generate PDF'
                });
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
            res.send(buffer);
        });
    } catch (error) {
        console.error('Download invoice error:', error);
        next(error);
    }
};
/**
 * @desc    Contact buyer about order
 * @route   POST /api/agriculture/seller/orders/:orderId/contact-buyer
 * @access  Private
 */
const contactBuyer = async (req, res, next) => {
    try {
        if (!ensureSellerAccess(req, res)) return;

        const { orderId } = req.params;
        const { message, subject } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        // Find order
        const order = await Order.findById(orderId).populate('buyer', 'name email phone');
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Verify seller ownership
        const product = await Product.findById(order.product);
        if (!product || product.seller.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Send email (implement your email service)
        // await sendEmail(order.buyer.email, subject || `Regarding Order #${order._id}`, message);

        // Save communication log
        const communication = {
            orderId: order._id,
            from: req.user.id,
            to: order.buyer._id,
            message: message,
            subject: subject,
            sentAt: new Date()
        };

        // Save to database if you have a communications collection
        // await Communication.create(communication);

        res.status(200).json({
            success: true,
            message: 'Message sent to buyer successfully'
        });

    } catch (error) {
        console.error('Contact buyer error:', error);
        next(error);
    }
};

// ==================== SELLER PRODUCTS CONTROLLERS ====================

/**
 * @desc    Get seller products
 * @route   GET /agriculture/seller/products
 * @access  Private
 */
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

/**
 * @desc    Get seller product by ID
 * @route   GET /agriculture/seller/products/:id
 * @access  Private
 */
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

/**
 * @desc    Create seller product
 * @route   POST /agriculture/seller/products
 * @access  Private
 */
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

/**
 * @desc    Update seller product
 * @route   PUT /agriculture/seller/products/:id
 * @access  Private
 */
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

/**
 * @desc    Delete seller product
 * @route   DELETE /agriculture/seller/products/:id
 * @access  Private
 */
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

// ==================== EXPORTS ====================

module.exports = {
    // Seller Dashboard & Orders
    getSellerDashboard,
    getSellerOrders,
    getSellerOrderStats,
    updateOrderStatus,
    downloadInvoice,
    contactBuyer,

    // Seller Products
    getSellerProducts,
    getSellerProductById,
    createSellerProduct,
    updateSellerProduct,
    deleteSellerProduct
};