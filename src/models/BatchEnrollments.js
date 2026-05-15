const mongoose = require('mongoose');

const batchEnrollmentSchema = new mongoose.Schema({
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['enrolled', 'waitlisted', 'completed', 'dropped', 'cancelled'],
        default: 'enrolled'
    },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: Date,
    droppedAt: Date,
    attendance: [{
        date: Date,
        status: { type: String, enum: ['present', 'absent', 'late'], default: 'absent' },
        markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    progress: { type: Number, default: 0 }, // Percentage
    certificateIssued: { type: Boolean, default: false },
    certificateNumber: String,
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'refunded'],
        default: 'pending'
    },
    paymentDetails: {
        amount: Number,
        transactionId: String,
        paidAt: Date
    }
}, {
    timestamps: true
});

batchEnrollmentSchema.index({ batch: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('BatchEnrollment', batchEnrollmentSchema);