const protect = require('./auth');
const restrictTo = require('./authorize');
const { loginLimiter, otpLimiter } = require('./rateLimiter');
const errorHandler = require('./errorHandler');
const notFound = require('./notFound');

module.exports = {
  protect,
  restrictTo,
  loginLimiter,
  otpLimiter,
  rateLimiter: { loginLimiter, otpLimiter },
  errorHandler,
  notFound,
};