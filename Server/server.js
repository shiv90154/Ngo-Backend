// server.js
require('dotenv').config();
const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db'); // ensure disconnectDB is exported

const PORT = process.env.PORT || 5000;

const requiredEnv = ['JWT_SECRET', 'MONGO_URI'];
const optionalEnv = [
  'EMAIL_USER', 'EMAIL_PASS',
  'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET',
  'BBPS_API_URL', 'BBPS_API_KEY', 'BBPS_MERCHANT_ID',
  'AEPS_API_URL', 'AEPS_API_KEY', 'AEPS_MERCHANT_ID',
  'BANK_VERIFICATION_API_URL', 'BANK_VERIFICATION_API_KEY'
];

const missingRequired = requiredEnv.filter(key => !process.env[key]);
const missingOptional = optionalEnv.filter(key => !process.env[key]);

if (missingRequired.length) {
  console.error(`❌ CRITICAL: Missing required environment variables: ${missingRequired.join(', ')}`);
  process.exit(1);
}

if (missingOptional.length) {
  console.warn(`⚠️ Warning: Missing optional environment variables: ${missingOptional.join(', ')}`);
  console.warn('   Some features (email, payments, AEPS, etc.) may not work.');
}

// ======================
// DATABASE CONNECTION & SERVER START
// ======================
let serverInstance = null;

const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');

    serverInstance = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API base: http://localhost:${PORT}/api`);
    });

    // Handle server errors (e.g., port already in use)
    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please free the port or change PORT in .env`);
      } else {
        console.error('❌ Server error:', err);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.error('   Please check your MONGO_URI in .env and ensure MongoDB is running.');
    process.exit(1);
  }
};

// ======================
// GRACEFUL SHUTDOWN
// ======================
const shutdown = async (signal) => {
  console.log(`\n🔴 ${signal} received. Shutting down gracefully...`);

  if (serverInstance) {
    serverInstance.close(async () => {
      console.log('✅ HTTP server closed');
      try {
        if (typeof disconnectDB === 'function') {
          await disconnectDB();
          console.log('✅ Database disconnected');
        }
      } catch (err) {
        console.error('❌ Error disconnecting database:', err);
      }
      process.exit(0);
    });

    // Force shutdown after 10 seconds if something hangs
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  console.error('   Server will now exit.');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('   Server will now exit.');
  process.exit(1);
});

// Start the server
startServer();