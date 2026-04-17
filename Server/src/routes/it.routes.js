const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  // Clients
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  // Projects
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  // Invoices
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  // Service Requests
  createServiceRequest,
  getServiceRequests,
  updateServiceRequestStatus,
  // Dashboard
  getDashboardStats
} = require('../controllers/it.controller');

// All routes require authentication
router.use(protect);

// ======================
// CLIENTS
// ======================
router.route('/clients')
  .get(getClients)
  .post(createClient);
router.route('/clients/:id')
  .get(getClientById)
  .put(updateClient)
  .delete(deleteClient);

// ======================
// PROJECTS
// ======================
router.route('/projects')
  .get(getProjects)
  .post(createProject);
router.route('/projects/:id')
  .get(getProjectById)
  .put(updateProject)
  .delete(deleteProject);

// ======================
// INVOICES
// ======================
router.route('/invoices')
  .get(getInvoices)
  .post(createInvoice);
router.route('/invoices/:id')
  .get(getInvoiceById);
router.put('/invoices/:id/status', updateInvoiceStatus);

// ======================
// SERVICE REQUESTS
// ======================
router.route('/service-requests')
  .get(getServiceRequests)
  .post(createServiceRequest);
router.put('/service-requests/:id/status', updateServiceRequestStatus);

// ======================
// DASHBOARD STATS
// ======================
router.get('/dashboard', getDashboardStats);

module.exports = router;