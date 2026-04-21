// src/routes/index.js
const express = require('express');
const router = express.Router();

const userRoutes = require('./auth.routes');
const healthcareRoutes = require('./healthcare.routes');
const mediaRoutes = require('./media.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');
const educationRoutes = require('./education.routes');   
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
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/education', educationRoutes);  
router.use('/it', itRoutes);
router.use('/agriculture', agricultureRoutes);
router.use('/finance', financeRoutes);

module.exports = router;