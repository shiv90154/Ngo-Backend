// routes/education.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const educationController = require('../controllers/education.controller');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const eduVal = require('../validators/educationValidator');

// ─── पब्लिक रूट्स ───
router.get('/courses', educationController.getPublishedCourses);
router.get('/courses/:id', protect, educationController.getCourseDetails);

// ─── स्टूडेंट ───
router.get('/my-courses', protect, educationController.getMyEnrollments);
router.post(
  '/courses/:id/enroll',
  protect,
  validate(eduVal.enrollCourse),
  educationController.enrollCourse
);
router.post(
  '/courses/:courseId/lessons/complete',
  protect,
  validate(eduVal.markLessonComplete),
  educationController.markLessonComplete
);
router.get('/tests/:testId/start', protect, educationController.startTest);
router.post('/tests/submit', protect, educationController.submitTest);
router.get('/certificates', protect, educationController.getMyCertificates);

// ─── टीचर / एडमिन ───
const instructorAuth = [protect, restrictTo('TEACHER', 'SUPER_ADMIN')];

router.post('/courses', ...instructorAuth, upload.single('thumbnail'), validate(eduVal.createCourse), educationController.createCourse);
router.get('/instructor/courses', ...instructorAuth, educationController.getMyCourses);
router.put('/courses/:id', ...instructorAuth, educationController.updateCourse);
router.delete('/courses/:id', ...instructorAuth, educationController.deleteCourse);

router.post('/chapters', ...instructorAuth, validate(eduVal.addChapter), educationController.addChapter);
router.post('/lessons', ...instructorAuth, validate(eduVal.addLesson), educationController.addLesson);
router.post('/tests', ...instructorAuth, validate(eduVal.createTest), educationController.createTest);
router.post('/questions', ...instructorAuth, validate(eduVal.addQuestion), educationController.addQuestion);

router.get('/instructor/dashboard', ...instructorAuth, educationController.getInstructorDashboard);

module.exports = router;