// routes/education.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const educationController = require('../controllers/education.controller');
const batchController = require('../controllers/batch.controller')
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

// ─── बैच रूट्स (स्टूडेंट) ───
router.get('/batches/available', protect, batchController.getAvailableBatchesForStudent);
router.get('/batches/filters', batchController.getBatchFilterOptions);
router.get('/batches/my-batches', protect, batchController.getMyBatches);
router.get('/batches/:batchId', batchController.getBatchDetails);
router.post('/batches/:batchId/enroll', protect, batchController.enrollInBatch);
// router.get('/batches/search', batchController.getBatchesByFilters);

// ─── टीचर / एडमिन ───
const instructorAuth = [protect, restrictTo('TEACHER', 'SUPER_ADMIN')];

// Course routes
router.post('/courses', ...instructorAuth, upload.single('thumbnail'), validate(eduVal.createCourse), educationController.createCourse);
router.get('/instructor/courses', ...instructorAuth, educationController.getMyCourses);
router.put('/courses/:id', ...instructorAuth, educationController.updateCourse);
router.delete('/courses/:id', ...instructorAuth, educationController.deleteCourse);

// Chapter & Lesson routes
router.post('/chapters', ...instructorAuth, validate(eduVal.addChapter), educationController.addChapter);
router.post('/lessons', ...instructorAuth, validate(eduVal.addLesson), educationController.addLesson);

// Test & Question routes
router.post('/tests', ...instructorAuth, validate(eduVal.createTest), educationController.createTest);
router.post('/questions', ...instructorAuth, validate(eduVal.addQuestion), educationController.addQuestion);

// Batch routes (Instructor)
router.get('/instructor/batches', ...instructorAuth, batchController.getInstructorBatches);
router.post('/instructor/batches', ...instructorAuth, validate(eduVal.createBatch), batchController.createBatch);
router.put('/instructor/batches/:batchId', ...instructorAuth, validate(eduVal.updateBatch), batchController.updateBatch);
router.get('/instructor/batches/:batchId', validate(eduVal.updateBatch), batchController.updateBatch);

// Dashboard
router.get('/instructor/dashboard', ...instructorAuth, educationController.getInstructorDashboard);

module.exports = router;