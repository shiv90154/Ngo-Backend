// src/routes/index.js
const express = require('express');
const router = express.Router();

// User routes (authentication, profile, etc.)
const userRoutes = require('./auth.routes');

// Education routes (courses, tests, certificates, etc.)
const educationRoutes = require('./educationRoutes');

// IT Services routes (clients, projects, invoices, service requests)
const itRoutes = require('./it.routes');


const agricultureRoutes = require('./agriculture.routes');

const financeRoutes = require('./finance.routes'); 

// ======================
// HEALTH CHECK
// ======================
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// ======================
// ROOT API INFO
// ======================
router.get('/', (req, res) => {
  res.json({
    name: 'Samraddh Bharat Foundation API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      education: '/api/education',
      it: '/api/it',
      agriculture: '/api/agriculture',
      finance: '/api/finance',          // <-- NEW
    },
  });
});

// ======================
// MOUNT ROUTES
// ======================
router.use('/users', userRoutes);
router.use('/education', educationRoutes);
router.use('/it', itRoutes);
router.use('/agriculture', agricultureRoutes);
router.use('/finance', financeRoutes);    // <-- NEW

module.exports = router;