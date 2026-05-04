const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    if (isConnected) return;

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: false,          // better for production
      maxPoolSize: 10,           // control connections
      serverSelectionTimeoutMS: 5000
    });

    isConnected = conn.connections[0].readyState === 1;

    if (process.env.NODE_ENV !== "production") {
      console.log(`MongoDB connected: ${conn.connection.host}`);
    }

  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

/* ================= CLEAN DISCONNECT ================= */
const disconnectDB = async () => {
  try {
    if (isConnected) {
      await mongoose.connection.close();
      isConnected = false;
      console.log('MongoDB disconnected');
    }
  } catch (error) {
    console.error('DB disconnect error:', error.message);
  }
};

/* ================= CONNECTION EVENTS ================= */
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('Mongoose disconnected');
});

module.exports = { connectDB, disconnectDB };