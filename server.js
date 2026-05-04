require('dotenv').config();

const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Validate required ENV
const requiredEnv = ['JWT_SECRET', 'MONGO_URI'];
const missing = requiredEnv.filter(k => !process.env[k]);

if (missing.length) {
  console.error(`Missing ENV: ${missing.join(', ')}`);
  process.exit(1);
}

let server;

// Start server
const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    server.on('error', (err) => {
      console.error('Server error:', err.message);
      process.exit(1);
    });

  } catch (err) {
    console.error('Startup error:', err.message);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down...`);

  if (server) {
    server.close(async () => {
      try {
        await disconnectDB();
        console.log('DB disconnected');
        process.exit(0);
      } catch (err) {
        console.error('Shutdown error:', err.message);
        process.exit(1);
      }
    });

    // Force shutdown fallback
    setTimeout(() => process.exit(1), 10000);
  } else {
    process.exit(0);
  }
};

// Process handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  shutdown('uncaughtException');
});

startServer();