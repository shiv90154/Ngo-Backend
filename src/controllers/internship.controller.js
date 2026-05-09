const Internship = require('../models/Internship');
const asyncHandler = require('express-async-handler');

// @desc    Get all internships (scoped by user's area)
// @route   GET /api/internships/all
exports.getAllInternships = asyncHandler(async (req, res) => {
  const filter = { ...req.scopeFilter };  // scopeFilter middleware से automatic
  const internships = await Internship.find(filter)
    .sort('-createdAt')
    .populate('createdBy', 'fullName');
  res.json({ success: true, internships });
});

// @desc    Create internship
// @route   POST /api/internships
exports.createInternship = asyncHandler(async (req, res) => {
  const { title, organization, description, location, startDate, endDate, stipend, applyLink } = req.body;
  const internship = await Internship.create({
    title,
    organization,
    description,
    location,
    startDate,
    endDate,
    stipend,
    applyLink,
    state: req.user.state,
    district: req.user.district,
    block: req.user.block,
    village: req.user.village,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, internship });
});

// @desc    Update internship
// @route   PUT /api/internships/:id
exports.updateInternship = asyncHandler(async (req, res) => {
  const internship = await Internship.findById(req.params.id);
  if (!internship) return res.status(404).json({ success: false, message: 'Not found' });
  // Only allow update by creator or SUPER_ADMIN
  if (req.user.role !== 'SUPER_ADMIN' && internship.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  const allowedFields = ['title', 'organization', 'description', 'location', 'startDate', 'endDate', 'stipend', 'applyLink', 'isActive'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) internship[field] = req.body[field];
  });
  await internship.save();
  res.json({ success: true, internship });
});

// @desc    Delete internship
// @route   DELETE /api/internships/:id
exports.deleteInternship = asyncHandler(async (req, res) => {
  const internship = await Internship.findById(req.params.id);
  if (!internship) return res.status(404).json({ success: false, message: 'Not found' });
  if (req.user.role !== 'SUPER_ADMIN' && internship.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  await internship.deleteOne();
  res.json({ success: true, message: 'Deleted' });
});