const Client = require('../models/Client');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Task = require('../models/Task');
const User = require('../models/user.model');

// ====================== 客户管理 ======================
exports.createClient = async (req, res) => {
  try {
    const client = await Client.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getClients = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { createdBy: req.user.id };
    if (search) {
      query.$text = { $search: search };
    }
    const clients = await Client.find(query)
      .populate('assignedTo', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Client.countDocuments(query);
    res.json({ success: true, clients, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate('assignedTo', 'fullName email');
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== 项目管理 ======================
exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, client } = req.query;
    const query = {};
    if (status) query.status = status;
    if (client) query.client = client;
    const projects = await Project.find(query)
      .populate('client', 'name company')
      .populate('team', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Project.countDocuments(query);
    res.json({ success: true, projects, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name company')
      .populate('team', 'fullName email');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== 发票管理 ======================
exports.createInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, client } = req.query;
    const query = {};
    if (status) query.status = status;
    if (client) query.client = client;
    const invoices = await Invoice.find(query)
      .populate('client', 'name company')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Invoice.countDocuments(query);
    res.json({ success: true, invoices, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'name company gstNumber')
      .populate('project', 'name');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== 任务管理 ======================
exports.createTask = async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const { project, assignedTo, status } = req.query;
    const query = {};
    if (project) query.project = project;
    if (assignedTo) query.assignedTo = assignedTo;
    if (status) query.status = status;
    const tasks = await Task.find(query)
      .populate('assignedTo', 'fullName email')
      .populate('project', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== 仪表盘统计 ======================
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const [clientCount, projectCount, activeProjects, invoiceCount, unpaidInvoices, recentTasks] = await Promise.all([
      Client.countDocuments({ createdBy: userId }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'active' }),
      Invoice.countDocuments(),
      Invoice.countDocuments({ status: { $in: ['sent', 'overdue'] } }),
      Task.find({ assignedTo: userId, status: { $ne: 'done' } }).limit(5).populate('project', 'name'),
    ]);
    res.json({
      success: true,
      stats: { clientCount, projectCount, activeProjects, invoiceCount, unpaidInvoices },
      recentTasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};