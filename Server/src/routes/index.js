// src/routes/index.js
const express = require('express');
const router = express.Router();

const userRoutes = require('./auth.routes');
const healthcareRoutes = require('./healthcare.routes');
const mediaRoutes = require('./media.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');
const educationRoutes = require('./education.routes');
const liveClassRoutes = require('./liveClass.routes');  
const itRoutes = require('./it.routes');
const agricultureRoutes = require('./agriculture.routes');
const financeRoutes = require('./finance.routes');
const mlmRoutes = require('./mlm.routes');
const subscriptionRoutes = require('./subscription.routes');   // 🆕 Subscription routes

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
router.use('/liveclass', liveClassRoutes);               
router.use('/it', itRoutes);
router.use('/agriculture', agricultureRoutes);
router.use('/finance', financeRoutes);
router.use('/mlm', mlmRoutes);
router.use('/subscription', subscriptionRoutes);          // 🆕 Mount subscription routes

module.exports = router;