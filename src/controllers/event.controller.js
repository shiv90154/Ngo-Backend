    const Event = require('../models/Event');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/sendEmail');

// ---------- ADMIN CRUD ----------
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
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort('-eventDate').lean();
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- PUBLIC: List upcoming events ----------
exports.getUpcomingEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: 'upcoming', eventDate: { $gte: new Date() } })
      .sort('eventDate')
      .lean();
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- USER: Register for an event ----------
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    const event = await Event.findById(eventId);
    if (!event || event.status !== 'upcoming') {
      return res.status(400).json({ success: false, message: 'Event is not open for registration' });
    }
    if (event.maxParticipants > 0 && event.registeredCount >= event.maxParticipants) {
      return res.status(400).json({ success: false, message: 'Registration full' });
    }

    // If paid, initiate payment (Razorpay) – simplified for now
    // We'll assume payment is handled on frontend and verified here

    event.registeredCount += 1;
    await event.save();

    // Send confirmation email
    const user = await User.findById(req.user.id);
    await sendEmail({
      to: user.email,
      subject: `Registration Confirmed – ${event.title}`,
      html: `<h2>You have registered for ${event.title}</h2><p>Date: ${event.eventDate.toLocaleDateString()}</p>`,
    });

    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Admin: view registered users for an event
exports.getEventRegistrations = async (req, res) => {
  try {
    // For a real system we'd have a Registration model – we'll return dummy count
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, registeredCount: event.registeredCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};