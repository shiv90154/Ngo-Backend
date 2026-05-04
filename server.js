require('dotenv').config();
const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const requiredEnv = ['JWT_SECRET', 'MONGO_URI'];

const missingRequired = requiredEnv.filter(key => !process.env[key]);

if (missingRequired.length) {
  process.exit(1);
}

let serverInstance = null;

const startServer = async () => {
  try {
    await connectDB();

    serverInstance = app.listen(PORT);

    serverInstance.on('error', () => {
      process.exit(1);
    });

  } catch (error) {
    process.exit(1);
  }
};

const shutdown = async () => {
  if (serverInstance) {
    serverInstance.close(async () => {
      try {
        if (typeof disconnectDB === 'function') {
          await disconnectDB();
        }
      } catch (err) {}
      process.exit(0);
    });

    setTimeout(() => {
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', () => {
  process.exit(1);
});

process.on('uncaughtException', () => {
  process.exit(1);
});

startServer();