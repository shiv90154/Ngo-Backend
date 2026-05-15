const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const eventController = require('../controllers/event.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

router.get('/upcoming', protect, eventController.getUpcomingEvents);
router.get('/all', protect, eventController.getAllEvents);
router.post('/register', protect, eventController.registerForEvent);
router.get('/:eventId/registrations', protect, eventController.getEventRegistrations);

// Admin / NGO Management
router.post('/', protect, restrictTo(...ALLOWED), eventController.createEvent);
router.put('/:id', protect, restrictTo(...ALLOWED), eventController.updateEvent);
router.delete('/:id', protect, restrictTo(...ALLOWED), eventController.deleteEvent);

module.exports = router;