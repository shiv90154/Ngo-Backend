const Internship = require('../models/Internship');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// @desc   Get all internships (scoped)
// @route  GET /api/internships/all
exports.getAllInternships = catchAsync(async (req, res) => {
  const filter = { ...req.scopeFilter };   // middleware: scopeFilter
  const internships = await Internship.find(filter)
    .sort('-createdAt')
    .populate('createdBy', 'fullName');
  res.json({ success: true, internships });
});

// @desc   Create internship
// @route  POST /api/internships
exports.createInternship = catchAsync(async (req, res, next) => {
  const { title, organization, description, location, startDate, endDate, stipend, applyLink } = req.body;

  if (!title || !organization) {
    return next(new AppError('शीर्षक और संगठन का नाम आवश्यक है', 400));
  }

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

// @desc   Update internship
// @route  PUT /api/internships/:id
exports.updateInternship = catchAsync(async (req, res, next) => {
  const internship = await Internship.findById(req.params.id);
  if (!internship) {
    return next(new AppError('Internship not found', 404));
  }

  // Only creator or SUPER_ADMIN can update
  if (req.user.role !== 'SUPER_ADMIN' && internship.createdBy.toString() !== req.user._id.toString()) {
    return next(new AppError('You are not authorized to update this internship', 403));
  }

  const allowedFields = [
    'title', 'organization', 'description', 'location',
    'startDate', 'endDate', 'stipend', 'applyLink', 'isActive'
  ];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) internship[field] = req.body[field];
  });

  await internship.save();
  res.json({ success: true, internship });
});

// @desc   Delete internship
// @route  DELETE /api/internships/:id
exports.deleteInternship = catchAsync(async (req, res, next) => {
  const internship = await Internship.findById(req.params.id);
  if (!internship) {
    return next(new AppError('Internship not found', 404));
  }

  if (req.user.role !== 'SUPER_ADMIN' && internship.createdBy.toString() !== req.user._id.toString()) {
    return next(new AppError('You are not authorized to delete this internship', 403));
  }

  await internship.deleteOne();
  res.json({ success: true, message: 'Internship deleted' });
});