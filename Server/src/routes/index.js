// src/routes/index.js
const express = require('express');
const router = express.Router();

const userRoutes = require('./auth.routes');
const healthcareRoutes = require('./healthcare.routes');
const mediaRoutes = require('./media.routes');

// Temporarily comment out other routes to isolate the error
const educationRoutes = require('./educationRoutes');
const itRoutes = require('./it.routes');
const agricultureRoutes = require('./agriculture.routes');
const financeRoutes = require('./finance.routes');

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Mount routes
router.use('/users', userRoutes);
router.use('/healthcare', healthcareRoutes);
router.use('/media', mediaRoutes);
router.use('/education', educationRoutes);
router.use('/it', itRoutes);
router.use('/agriculture', agricultureRoutes);
router.use('/finance', financeRoutes);

module.exports = router;