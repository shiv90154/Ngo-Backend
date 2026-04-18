const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
    cropName: {
        type: String,
        required: [true, 'Crop name is required'],
        trim: true
    },
    sowingDate: {
        type: Date,
        required: [true, 'Sowing date is required']
    },
    expectedHarvestDate: {
        type: Date,
        required: [true, 'Expected harvest date is required']
    },
    areaCultivated: {
        type: Number,
        required: [true, 'Area cultivated is required'],
        min: 0
    },
    expectedYield: {
        type: Number,
        required: [true, 'Expected yield is required'],
        min: 0
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Crop', cropSchema);