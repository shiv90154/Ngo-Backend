require('dotenv').config();

const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

/* ================= ENV VALIDATION ================= */
const requiredEnv = ['JWT_SECRET', 'MONGO_URI'];
const missing = requiredEnv.filter(k => !process.env[k]);

if (missing.length) {
  console.error(`❌ Missing ENV: ${missing.join(', ')}`);
  process.exit(1);
}

// 🔐 Enforce strong JWT secret
if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET too weak (min 32 chars required)');
  process.exit(1);
}

let server;

/* ================= START SERVER ================= */
const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} already in use`);
      } else {
        console.error('❌ Server error:', err.message);
      }
      process.exit(1);
    });

  } catch (err) {
    console.error('❌ Startup error:', err.message);
    process.exit(1);
  }
};

/* ================= GRACEFUL SHUTDOWN ================= */
const shutdown = async (signal) => {
  console.log(`⚠️ Received ${signal}. Shutting down...`);

  if (server) {
    server.close(async () => {
      try {
        await disconnectDB();
        console.log('✅ DB disconnected');
        process.exit(0);
      } catch (err) {
        console.error('❌ Shutdown error:', err.message);
        process.exit(1);
      }
    });

    // Force exit after 10s
    setTimeout(() => {
      console.error('❌ Force shutdown');
      process.exit(1);
    }, 10000);

  } else {
    process.exit(0);
  }
};

/* ================= PROCESS HANDLERS ================= */
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  shutdown('uncaughtException');
});

/* ================= START ================= */
startServer();