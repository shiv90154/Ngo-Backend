// models/AgricultureAddress.js
const mongoose = require("mongoose");

const customerAddressSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        addressLine: {
            type: String,
            required: true,
            trim: true,
        },

        city: {
            type: String,
            required: true,
            trim: true,
        },

        state: {
            type: String,
            required: true,
            trim: true,
        },

        pincode: {
            type: String,
            required: true,
            trim: true,
        },

        landmark: {
            type: String,
            trim: true,
        },

        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("CustomerAddress", customerAddressSchema);