const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const liveClassController = require('../controllers/liveClass.controller');


router.post('/', protect, restrictTo('TEACHER', 'SUPER_ADMIN'), liveClassController.createLiveClass);
router.put('/:id/end', protect, restrictTo('TEACHER', 'SUPER_ADMIN'), liveClassController.endLiveClass);


router.get('/course/:courseId', protect, liveClassController.getLiveClassesByCourse);


router.post('/:liveClassId/reserve', protect, liveClassController.reserveLiveClass);


router.get('/:id', protect, liveClassController.getLiveClassDetails);

module.exports = router;