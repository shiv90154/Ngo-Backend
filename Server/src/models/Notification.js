const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,          // null for system‑generated notifications
    },
    type: {
      type: String,
      required: true,
      enum: [
        'like', 'comment', 'follow', 'mention', 'global',
        'doctor_message', 'teacher_message', 'agent_message',
        'appointment_reminder', 'prescription_added',
        'course_enrolled', 'test_result',
        'contract_update', 'wallet_credited', 'loan_sanctioned',
        'emi_reminder', 'bill_paid', 'subscription_expiry',
        'mlm_commission', 'store_order',
      ],
    },
    read: { type: Boolean, default: false },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaPost', default: null },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    metadata: { type: Object, default: {} },   // flexible data e.g. { title, message, courseId, appointmentId }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);