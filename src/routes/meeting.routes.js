const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const meetingController = require('../controllers/meeting.controller');

// Admin / Supervisor routes
router.post('/', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), meetingController.createMeeting);
router.get('/', protect, meetingController.getAllMeetings);  // any logged-in user can see
router.get('/:id', protect, meetingController.getMeeting);
router.put('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), meetingController.updateMeeting);
router.delete('/:id', protect, restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'), meetingController.deleteMeeting);

// Chat
router.post('/:id/messages', protect, meetingController.sendMessage);

module.exports = router;