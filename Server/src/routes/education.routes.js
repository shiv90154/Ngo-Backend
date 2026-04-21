const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const educationController = require('../controllers/education.controller');
const upload = require('../middleware/upload');

// 公开路由
router.get('/courses', educationController.getPublishedCourses);
router.get('/courses/:id', protect, educationController.getCourseDetails); // 登录后查看详情

// 学生路由
router.post('/courses/:id/enroll', protect, educationController.enrollCourse);
router.post('/courses/:courseId/lessons/complete', protect, educationController.markLessonComplete);
router.get('/tests/:testId/start', protect, educationController.startTest);
router.post('/tests/submit', protect, educationController.submitTest);

// 教师/管理员路由
router.use(protect);
router.post(
  '/courses',
  restrictTo('TEACHER', 'SUPER_ADMIN'),
  upload.single('thumbnail'),
  educationController.createCourse
);
router.get(
  '/instructor/courses',
  restrictTo('TEACHER', 'SUPER_ADMIN'),
  educationController.getMyCourses
);
router.put(
  '/courses/:id',
  restrictTo('TEACHER', 'SUPER_ADMIN'),
  educationController.updateCourse
);
router.delete(
  '/courses/:id',
  restrictTo('TEACHER', 'SUPER_ADMIN'),
  educationController.deleteCourse
);
router.post(
  '/chapters',
  restrictTo('TEACHER', 'SUPER_ADMIN'),
  educationController.addChapter
);
router.post(
  '/lessons',
  restrictTo('TEACHER', 'SUPER_ADMIN'),
  educationController.addLesson
);
router.post(
  '/tests',
  restrictTo('TEACHER', 'SUPER_ADMIN'),
  educationController.createTest
);
router.post(
  '/questions',
  restrictTo('TEACHER', 'SUPER_ADMIN'),
  educationController.addQuestion
);
router.get(
  '/instructor/dashboard',
  restrictTo('TEACHER', 'SUPER_ADMIN'),
  educationController.getInstructorDashboard
);

module.exports = router;