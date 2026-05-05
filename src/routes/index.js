const express = require('express');
const router = express.Router();

const userRoutes = require('./auth.routes');
const healthcareRoutes = require('./healthcare.routes');
const medicineRoutes = require('./medicines.routes');        
const mediaRoutes = require('./media.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');
const educationRoutes = require('./education.routes');
const liveClassRoutes = require('./liveClass.routes');
const itRoutes = require('./serviceRequest.routes');
const agricultureRoutes = require('./agriculture.Routes');
const financeRoutes = require('./finance.routes');
const mlmRoutes = require('./mlm.routes');
const subscriptionRoutes = require('./subscription.routes');
const adRoutes = require('./ad.routes');
const donationRoutes = require('./donation.routes');
const clubRoutes = require('./club.routes');                 // ✅ fixed – proper import

const searchController = require('../controllers/search.controller');

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Mount routes
router.use('/users', userRoutes);
router.use('/healthcare', healthcareRoutes);
router.use('/medicines', medicineRoutes);
router.use('/media', mediaRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/education', educationRoutes);
router.use('/liveclass', liveClassRoutes);
router.use('/service-requests', require('./serviceRequest.routes'));
router.use('/agriculture', agricultureRoutes);
router.use('/finance', financeRoutes);
router.use('/mlm', mlmRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/ads', adRoutes);
router.use('/donations', donationRoutes);
router.use('/club', clubRoutes);                             // ✅ Club routes mounted

router.get('/search', require('../controllers/search.controller').globalSearch);

module.exports = router;