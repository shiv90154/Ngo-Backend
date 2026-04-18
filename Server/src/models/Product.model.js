const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters']
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description too long']
        },
        category: {
            type: String,
            enum: ['seeds', 'fertilizers', 'equipment', 'livestock', 'produce', 'pesticides', 'tools'],
            required: [true, 'Category is required']
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative']
        },
        quantity: {
            type: Number,
            default: 1,
            min: [0, 'Quantity cannot be negative']
        },
        unit: {
            type: String,
            default: 'kg',
            enum: ['kg', 'g', 'litre', 'piece', 'bundle', 'dozen', 'tonne']
        },
        images: {
            type: [String],
            default: []
        },
        imageUrl: {
            type: String,
            default: ''
        },
        location: {
            type: String,
            trim: true,
            default: ''
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        isOrganic: {
            type: Boolean,
            default: false
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Seller (contractor) is required']
        }
    },
    { timestamps: true }
);

// Create text index for search functionality
productSchema.index({ name: 'text', description: 'text' });

// Optional: compound index for common filters
productSchema.index({ category: 1, isAvailable: 1, price: 1 });

module.exports = mongoose.model('Product', productSchema);