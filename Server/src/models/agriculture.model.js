// models/Agriculture.js
const mongoose = require('mongoose');

const agricultureSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    diseaseDetections: [{ imageUrl: String, diseaseName: String, confidence: Number, treatment: String, detectedAt: Date }],
    productListings: [{ productName: String, quantityAvailable: Number, pricePerUnit: Number, status: String, listedAt: Date }],
    ordersReceived: [{ buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, productId: mongoose.Schema.Types.ObjectId, quantity: Number, totalAmount: Number, status: String, orderDate: Date }],
    contracts: [{ buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, cropName: String, quantity: Number, agreedPrice: Number, startDate: Date, endDate: Date, status: String }],
    stats: {
        totalProducts: { type: Number, default: 0 },
        totalOrders: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 }
    }
}, { timestamps: true });
const getSellerOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;
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
                status: order.status,
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
module.exports = mongoose.model('Agriculture', agricultureSchema);