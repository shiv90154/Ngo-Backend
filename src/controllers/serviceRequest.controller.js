// controllers/serviceRequest.controller.js
const ServiceRequest = require('../models/ServiceRequest');
const path = require('path');
const fs = require('fs').promises;

const uploadDir = path.join(__dirname, '../uploads/service-requests');
(async () => { await fs.mkdir(uploadDir, { recursive: true }); })();

// ---------- CREATE (updated to include new fields) ----------
exports.createRequest = async (req, res) => {
  try {
    const { serviceType, title, description, contactNumber, isUrgent } = req.body;
    if (!serviceType || !title || !description) {
      return res.status(400).json({ success: false, message: 'Service type, title and description are required' });
    }

    const requestData = {
      user: req.user.id,
      serviceType,
      title,
      description,
      contactNumber: contactNumber || '',
      isUrgent: isUrgent === 'true' || isUrgent === true,
      createdBy: req.user.id,
    };

    // Handle attachments
    if (req.files && req.files.length > 0) {
      requestData.attachments = [];
      for (const file of req.files) {
        const ext = path.extname(file.originalname);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}${ext}`;
        const newPath = path.join(uploadDir, fileName);
        await fs.rename(file.path, newPath);
        requestData.attachments.push({
          fileUrl: `/uploads/service-requests/${fileName}`,
          fileName: file.originalname,
        });
      }
    }

    const serviceRequest = await ServiceRequest.create(requestData);
    res.status(201).json({ success: true, serviceRequest });
  } catch (error) {
    if (req.files) {
      for (const file of req.files) await fs.unlink(file.path).catch(() => {});
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- GET MY REQUESTS (already fine) ----------
exports.getMyRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { user: req.user.id };
    if (status) filter.status = status;

    const requests = await ServiceRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await ServiceRequest.countDocuments(filter);
    res.json({
      success: true,
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- ADMIN GET ALL (unchanged) ----------
exports.getAllRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, serviceType, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (serviceType) filter.serviceType = serviceType;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const requests = await ServiceRequest.find(filter)
      .populate('user', 'fullName email phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await ServiceRequest.countDocuments(filter);
    res.json({
      success: true,
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- GET SINGLE ----------
exports.getRequestById = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id)
      .populate('user', 'fullName email phone')
      .lean();
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (req.user.id !== request.user._id.toString() &&
        !req.user.role.includes('ADMIN') &&
        req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- USER UPDATE (only own request, limited fields) ----------
exports.updateMyRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // Only owner can edit (admin can also but using different endpoint)
    if (req.user.id !== request.user.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, description, contactNumber, isUrgent } = req.body;
    if (title) request.title = title;
    if (description) request.description = description;
    if (contactNumber !== undefined) request.contactNumber = contactNumber;
    if (isUrgent !== undefined) request.isUrgent = isUrgent === 'true' || isUrgent === true;

    // Handle new attachments? (optional) – we can add but keep simple for now
    // If you want to support replacing attachments, you can add later.

    request.updatedBy = req.user.id;
    await request.save();
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- ADMIN UPDATE (status, notes) ----------
exports.updateRequest = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (status) request.status = status;
    if (adminNotes !== undefined) request.adminNotes = adminNotes;
    request.updatedBy = req.user.id;
    await request.save();

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- DELETE (owner or admin) ----------
exports.deleteRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // Only the owner or an admin can delete
    if (req.user.id !== request.user.toString() &&
        req.user.role !== 'SUPER_ADMIN' &&
        req.user.role !== 'ADDITIONAL_DIRECTOR') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete attachments from disk
    if (request.attachments && request.attachments.length > 0) {
      for (const att of request.attachments) {
        const filePath = path.join(__dirname, '..', att.fileUrl);
        await fs.unlink(filePath).catch(() => {});
      }
    }

    await ServiceRequest.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};