const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { protect, restrictTo } = require('../middleware');

// Public
router.get('/upcoming', eventController.getUpcomingEvents);

// User
router.post('/register', protect, eventController.registerForEvent);

// Admin
router.post('/', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), eventController.createEvent);
router.put('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), eventController.updateEvent);
router.delete('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), eventController.deleteEvent);
router.get('/all', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), eventController.getAllEvents);
router.get('/:id/registrations', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), eventController.getEventRegistrations);

module.exports = router;