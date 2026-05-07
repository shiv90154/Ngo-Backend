const express = require('express');
const router = express.Router();

// ---------- Import Route Modules (fully built & production-ready) ----------
const userRoutes = require('./auth.routes');
const healthcareRoutes = require('./healthcare.routes');
const educationRoutes = require('./education.routes');

// ---------- Other route imports (commented – not yet production-ready) ----------
const medicineRoutes = require('./medicines.routes');
const mediaRoutes = require('./media.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');
const liveClassRoutes = require('./liveClass.routes');
const agricultureRoutes = require('./agriculture.Routes');
const financeRoutes = require('./finance.routes');
const mlmRoutes = require('./mlm.routes');
const subscriptionRoutes = require('./subscription.routes');
const adRoutes = require('./ad.routes');
const clubRoutes = require('./club.routes');
const dashboardRoutes = require('./dashboard.routes');
const beneficiaryRoutes = require('./beneficiary.routes');
const donationRoutes = require('./donation.routes');
const campaignRoutes = require('./campaign.routes');
const memberCertificateRoutes = require('./memberCertificate.routes');
const eventRoutes = require('./event.routes');
const expenseRoutes = require('./expense.routes');
const serviceRequestRoutes = require('./serviceRequest.routes');
const searchController = require('../controllers/search.controller');

// ---------- Health Check ----------
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// ---------- Mount Active Routes ----------
router.use('/users', userRoutes);
router.use('/healthcare', healthcareRoutes);
router.use('/education', educationRoutes);

// ---------- Future routes (commented out) ----------
router.use('/medicines', medicineRoutes);
router.use('/media', mediaRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/liveclass', liveClassRoutes);
router.use('/service-requests', serviceRequestRoutes);
router.use('/agriculture', agricultureRoutes);
router.use('/finance', financeRoutes);
router.use('/mlm', mlmRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/ads', adRoutes);
router.use('/club', clubRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/beneficiaries', beneficiaryRoutes);
router.use('/donations', donationRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/member-certificates', memberCertificateRoutes);
router.use('/events', eventRoutes);
router.use('/expenses', expenseRoutes);
router.use('/contributions', require('./contribution.routes'));
router.get('/search', searchController.globalSearch);

module.exports = router;