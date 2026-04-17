const Client = require('../models/Client.model');
const Project = require('../models/Project.model');
const Invoice = require('../models/Invoice.model');
const ServiceRequest = require('../models/ServiceRequest.model');

// Helper: generate unique invoice number
const generateInvoiceNumber = async () => {
  const count = await Invoice.countDocuments();
  return `INV-${(count + 1).toString().padStart(6, '0')}`;
};

// ======================
// CLIENT CONTROLLERS
// ======================
exports.createClient = async (req, res) => {
  try {
    const client = await Client.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// PROJECT CONTROLLERS
// ======================
exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ createdBy: req.user.id })
      .populate('client', 'name email company')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('client', 'name email phone company');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// INVOICE CONTROLLERS
// ======================
exports.createInvoice = async (req, res) => {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    const { items, tax = 0 } = req.body;
    let subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const total = subtotal + (subtotal * tax / 100);
    const invoice = await Invoice.create({
      ...req.body,
      invoiceNumber,
      total,
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ createdBy: req.user.id })
      .populate('client', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('client')
      .populate('project');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { status, paidAt: status === 'paid' ? new Date() : undefined },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// SERVICE REQUEST CONTROLLERS
// ======================
exports.createServiceRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getServiceRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ createdBy: req.user.id })
      .populate('client', 'name email')
      .populate('assignedTo', 'fullName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateServiceRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const request = await ServiceRequest.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { status, resolvedAt: status === 'resolved' ? new Date() : undefined },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// DASHBOARD STATS
// ======================
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const totalClients = await Client.countDocuments({ createdBy: userId });
    const totalProjects = await Project.countDocuments({ createdBy: userId });
    const activeProjects = await Project.countDocuments({ createdBy: userId, status: 'active' });
    const totalInvoices = await Invoice.countDocuments({ createdBy: userId });
    const paidInvoices = await Invoice.countDocuments({ createdBy: userId, status: 'paid' });
    const totalRevenue = await Invoice.aggregate([
      { $match: { createdBy: userId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const pendingRequests = await ServiceRequest.countDocuments({ createdBy: userId, status: 'pending' });

    res.json({
      success: true,
      data: {
        totalClients,
        totalProjects,
        activeProjects,
        totalInvoices,
        paidInvoices,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingRequests
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};