const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));

app.use('/api/finance/webhooks/razorpay', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;