const Event = require('../models/Event');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// @desc   Get upcoming events (future events) - scoped
exports.getUpcomingEvents = catchAsync(async (req, res) => {
  const events = await Event.find({
    eventDate: { $gte: new Date() },
    ...req.scopeFilter
  }).sort({ eventDate: 1 });

  res.json({ success: true, events });
});

// @desc   Get all events (scoped)
exports.getAllEvents = catchAsync(async (req, res) => {
  const events = await Event.find(req.scopeFilter).sort({ eventDate: 1 });
  res.json({ success: true, events });
});

// @desc   Create a new event (Admin/NGO)
exports.createEvent = catchAsync(async (req, res, next) => {
  const eventData = { ...req.body, createdBy: req.user.id };

  // Optional: ensure scope fields from the creator if not provided
  if (!eventData.state) eventData.state = req.user.state;
  if (!eventData.district) eventData.district = req.user.district;
  if (!eventData.block) eventData.block = req.user.block;
  if (!eventData.village) eventData.village = req.user.village;

  const event = await Event.create(eventData);
  res.status(201).json({ success: true, event });
});

// @desc   Update an event (Admin/NGO)
exports.updateEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!event) {
    return next(new AppError('Event not found', 404));
  }
  res.json({ success: true, event });
});

// @desc   Delete an event (Admin/NGO)
exports.deleteEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) {
    return next(new AppError('Event not found', 404));
  }
  res.json({ success: true, message: 'Event deleted' });
});

// @desc   Register current user for an event
exports.registerForEvent = catchAsync(async (req, res, next) => {
  const { eventId } = req.body;
  if (!eventId) {
    return next(new AppError('Event ID is required', 400));
  }

  const event = await Event.findById(eventId);
  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  // Check if already registered
  if (event.participants.includes(req.user.id)) {
    return next(new AppError('You are already registered for this event', 400));
  }

  // Check max participants limit
  if (event.maxParticipants && event.registeredCount >= event.maxParticipants) {
    return next(new AppError('Event is already full', 400));
  }

  // Register
  event.participants.push(req.user.id);
  event.registeredCount = event.participants.length; // update count
  await event.save();

  res.json({ success: true, message: 'Registered successfully' });
});

// @desc   Get registrations for an event (Admin/NGO)
exports.getEventRegistrations = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.eventId).populate('participants', 'fullName email');
  if (!event) {
    return next(new AppError('Event not found', 404));
  }
  res.json({ success: true, registrations: event.participants });
});