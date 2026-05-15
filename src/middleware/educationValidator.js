const { body, param, query } = require('express-validator');

exports.createCourse = [
  body('title').notEmpty().withMessage('टाइटल आवश्यक है'),
  body('category').optional().isIn(['UPSC','Banking','Agriculture','School','Skill']).withMessage('अमान्य कैटेगरी'),
];

exports.addChapter = [
  body('courseId').isMongoId().withMessage('अमान्य कोर्स ID'),
  body('title').notEmpty().withMessage('चैप्टर टाइटल आवश्यक है'),
  body('order').isNumeric().withMessage('ऑर्डर संख्या होनी चाहिए'),
];

exports.addLesson = [
  body('chapterId').isMongoId(),
  body('title').notEmpty(),
  body('type').isIn(['video','pdf','quiz']),
  body('order').isNumeric(),
];

exports.createTest = [
  body('courseId').isMongoId(),
  body('title').notEmpty(),
  body('duration').isNumeric(),
  body('totalMarks').isNumeric(),
  body('passingMarks').isNumeric(),
];

exports.addQuestion = [
  body('testId').isMongoId(),
  body('questionText').notEmpty(),
  body('options').isArray({ min: 2 }).withMessage('कम से कम 2 ऑप्शन आवश्यक'),
  body('correctAnswer').isNumeric(),
  body('marks').optional().isNumeric(),
];

exports.enrollCourse = [
  param('id').isMongoId(),
];

exports.markLessonComplete = [
  param('courseId').isMongoId(),
  body('lessonId').isMongoId(),
];