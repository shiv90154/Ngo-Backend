// src/utils/meetingHelper.js
const crypto = require('crypto');

/**
 * 生成唯一的会议ID（可用于Agora、自定义WebRTC等）
 * @returns {string} 随机会议ID
 */
exports.generateMeetingId = () => {
  // 生成类似 'room-abc123' 的ID
  return 'room-' + crypto.randomBytes(6).toString('hex');
};

/**
 * 生成会议密码（可选）
 * @returns {string} 6位随机数字密码
 */
exports.generateMeetingPassword = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};