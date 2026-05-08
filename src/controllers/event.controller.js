const Event = require('../models/Event'); // fields: title, description, eventDate, location, maxParticipants, registeredCount, state

exports.getUpcomingEvents = async (req, res) => {
  try {
    const events = await Event.find({ eventDate: { $gte: new Date() }, ...req.scopeFilter }).sort({ eventDate: 1 });
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find(req.scopeFilter).sort({ eventDate: 1 });
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.body.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    // Add registration logic (e.g., add user to participants array)
    res.json({ success: true, message: 'Registered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getEventRegistrations = async (req, res) => {
  // Implement based on your registration model
  res.json({ success: true, registrations: [] });
};