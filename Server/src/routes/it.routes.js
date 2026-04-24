const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const itController = require('../controllers/it.controller');

router.use(protect); 
router.get('/dashboard', itController.getDashboard);

// 客户
router.post('/clients', itController.createClient);
router.get('/clients', itController.getClients);
router.get('/clients/:id', itController.getClient);
router.put('/clients/:id', itController.updateClient);
router.delete('/clients/:id', restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), itController.deleteClient);

// 项目
router.post('/projects', itController.createProject);
router.get('/projects', itController.getProjects);
router.get('/projects/:id', itController.getProject);
router.put('/projects/:id', itController.updateProject);
router.delete('/projects/:id', restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), itController.deleteProject);

// 发票
router.post('/invoices', itController.createInvoice);
router.get('/invoices', itController.getInvoices);
router.get('/invoices/:id', itController.getInvoice);
router.put('/invoices/:id', itController.updateInvoice);
router.delete('/invoices/:id', restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), itController.deleteInvoice);

// 任务
router.post('/tasks', itController.createTask);
router.get('/tasks', itController.getTasks);
router.put('/tasks/:id', itController.updateTask);
router.delete('/tasks/:id', itController.deleteTask);

module.exports = router;