const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  liveClass: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveClass', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  type: { type: String, enum: ['chat', 'qa'], default: 'chat' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LiveClassMessage', messageSchema);