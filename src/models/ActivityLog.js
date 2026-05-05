const mongoose = require('mongoose');
const logSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,            // e.g., "USER_UPDATED", "COURSE_CREATED"
  details: String,
  ip: String,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ActivityLog', logSchema);