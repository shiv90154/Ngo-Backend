const mongoose = require("mongoose");


const batchSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'बैच का शीर्षक आवश्यक है']
    },
    description: String,
    category: String,
    targetClasses: {
        type: [String], // Make sure this is defined as an array
        default: []
    },
    targetInterests: {
        type: [String], // Make sure this is defined as an array
        default: []
    },
    maxStudents: {
        type: Number,
        default: 50
    },
    startDate: Date,
    endDate: Date,
    schedule: {
        days: {
            type: [String],
            default: []
        },
        startTime: String,
        endTime: String,
        timezone: String
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
    },
    mode: {
        type: String,
        enum: ['online', 'offline', 'hybrid'],
        default: 'online'
    },
    meetingLink: String,
    venue: String,
    fee: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});
// Index for efficient queries
batchSchema.index({
    targetClasses: 1,
    targetInterests: 1,
    isActive: 1,
    isPublished: 1,
});

batchSchema.index({ instructor: 1, startDate: -1 });
batchSchema.index({ enrolledStudents: 1 });

module.exports = mongoose.model("Batch", batchSchema);