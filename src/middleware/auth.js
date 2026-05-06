const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const User = require('../models/user.model');

module.exports = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return next(new AppError('आप लॉगिन नहीं हैं। कृपया लॉगिन करें।', 401));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new AppError('यूज़र नहीं मिला।', 401));
    if (user.isDeleted) return next(new AppError('आपका अकाउंट निष्क्रिय है।', 403));
    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('अमान्य टोकन।', 401));
  }
};