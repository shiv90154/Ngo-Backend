const express = require('express');
const router = express.Router();

// ---------- Import Route Modules ----------
const userRoutes = require('./auth.routes');
const healthcareRoutes = require('./healthcare.routes');
const educationRoutes = require('./education.routes');
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
const contributionRoutes = require('./contribution.routes');
const newsRoutes = require('./news.routes');
const internshipRoutes = require('./internship.routes');   // 🆕 Internship
const productSaleRoutes = require('./productSale.routes'); // 🆕 Product Sale (Licenses + Education)
const searchController = require('../controllers/search.controller');

// ---------- Health Check ----------
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// ---------- Mount Routes ----------
router.use('/users', userRoutes);
router.use('/healthcare', healthcareRoutes);
router.use('/education', educationRoutes);
router.use('/medicines', medicineRoutes);
router.use('/media', mediaRoutes);
router.use('/news', newsRoutes);
router.use('/internships', internshipRoutes);            // 🆕 Internship endpoints
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
router.use('/contributions', contributionRoutes);
router.use('/products', productSaleRoutes);               // 🆕 Product Sale (Licenses + Education Programs)
router.get('/search', searchController.globalSearch);

module.exports = router;