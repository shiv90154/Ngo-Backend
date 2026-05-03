// src/middleware/index.js
const authMiddleware = require('./auth.middleware');

// 404 Not Found middleware
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// ✅ CRITICAL: Ensure these are functions
module.exports = {
  protect: authMiddleware.protect,        // function
  authorize: authMiddleware.authorize,    // function
  restrictTo: authMiddleware.restrictTo,  // function (alias)
  notFound,                               // function
  errorHandler,                           // function
};