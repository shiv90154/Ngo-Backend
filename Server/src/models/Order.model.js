const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Buyer is required']
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Seller is required']
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product is required']
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1']
        },
        totalPrice: {
            type: Number,
            required: true,
            min: [0, 'Total price cannot be negative']
        },
        deliveryAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: String,
            pincode: String,
            landmark: String
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
            default: 'pending'
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },
        paymentMethod: {
            type: String,
            enum: ['cash_on_delivery', 'card', 'upi', 'bank_transfer'],
            default: 'cash_on_delivery'
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 500
        }
    },
    { timestamps: true }
);

// Indexes for faster queries
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, status: 1 });
orderSchema.index({ product: 1 });

// Auto‑calculate totalPrice before saving (optional safety)
orderSchema.pre('save', async function (next) {
    if (this.isModified('quantity') || this.isNew) {
        const product = await mongoose.model('Product').findById(this.product);
        if (product) {
            this.totalPrice = product.price * this.quantity;
        }
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);