// server.js (or index.js)
require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/db'); // adjust path if needed

const PORT = process.env.PORT || 5000;

// ======================
// ENVIRONMENT VALIDATION
// ======================
const requiredEnv = ['JWT_SECRET'];
const optionalEnv = ['EMAIL_USER', 'EMAIL_PASS', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
const missingRequired = requiredEnv.filter(key => !process.env[key]);
const missingOptional = optionalEnv.filter(key => !process.env[key]);

if (missingRequired.length) {
  console.error(`❌ CRITICAL: Missing required environment variables: ${missingRequired.join(', ')}`);
  console.error('   Server will not start without JWT_SECRET.');
  process.exit(1);
}

if (missingOptional.length) {
  console.warn(`⚠️ Warning: Missing optional environment variables: ${missingOptional.join(', ')}`);
  console.warn('   Some features (email, payments) may not work.');
}

// ======================
// DATABASE CONNECTION
// ======================
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API base: http://localhost:${PORT}/api`);
    });

    // Handle server errors (e.g., port already in use)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please free the port or change PORT in .env`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
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
let serverInstance = null;

const shutdown = async (signal) => {
  console.log(`\n🔴 ${signal} received. Shutting down gracefully...`);
  
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('✅ HTTP server closed');
      // If you have a disconnectDB function, call it here
      // await disconnectDB();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ======================
// UNHANDLED ERRORS
// ======================
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Perform cleanup then exit
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