const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Security
const helmet = require('helmet');
const morgan = require('morgan');
const hpp = require('hpp');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');

// Routes & middleware
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware');

const app = express();

/* ================= SECURITY ================= */
app.use(helmet());
app.use(hpp());
app.use(xss());
app.use(mongoSanitize());

/* ================= LOGGING ================= */
app.use(morgan('dev'));

/* ================= CORS ================= */
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

/* ================= WEBHOOK (RAW BODY) ================= */
app.use('/api/finance/webhooks/razorpay',
  express.raw({ type: 'application/json' })
);

/* ================= BODY PARSER ================= */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ================= COMPRESSION ================= */
app.use(compression());

/* ================= STATIC ================= */
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

/* ================= HEALTH CHECK ================= */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Running',
    timestamp: new Date().toISOString()
  });
});

/* ================= ROUTES ================= */
app.use('/api', routes);

/* ================= ERROR HANDLING ================= */
app.use(notFound);
app.use(errorHandler);

module.exports = app;