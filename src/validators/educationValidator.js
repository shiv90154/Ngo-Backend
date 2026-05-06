// validators/educationValidator.js
const { body, param, query } = require('express-validator');

exports.createCourse = [
  body('title')
    .notEmpty()
    .withMessage('कोर्स का शीर्षक आवश्यक है'),
  body('category')
    .optional()
    .isIn(['UPSC', 'Banking', 'Agriculture', 'School', 'Skill'])
    .withMessage('अमान्य श्रेणी'),
  body('language')
    .optional()
    .isString()
    .withMessage('भाषा अमान्य है'),
];

exports.addChapter = [
  body('courseId')
    .isMongoId()
    .withMessage('अमान्य कोर्स ID'),
  body('title')
    .notEmpty()
    .withMessage('चैप्टर का शीर्षक आवश्यक है'),
  body('order')
    .isNumeric()
    .withMessage('क्रम संख्या होनी चाहिए'),
];

exports.addLesson = [
  body('chapterId')
    .isMongoId()
    .withMessage('अमान्य चैप्टर ID'),
  body('title')
    .notEmpty()
    .withMessage('पाठ का शीर्षक आवश्यक है'),
  body('type')
    .isIn(['video', 'pdf', 'quiz'])
    .withMessage('पाठ का प्रकार (video, pdf, quiz) होना चाहिए'),
  body('order')
    .isNumeric()
    .withMessage('क्रम संख्या आवश्यक है'),
  body('content')
    .optional()
    .isObject(),
];

exports.createTest = [
  body('courseId')
    .isMongoId()
    .withMessage('अमान्य कोर्स ID'),
  body('title')
    .notEmpty()
    .withMessage('टेस्ट का शीर्षक आवश्यक है'),
  body('duration')
    .isNumeric()
    .withMessage('अवधि मिनटों में संख्या होनी चाहिए'),
  body('totalMarks')
    .isNumeric()
    .withMessage('कुल अंक संख्या होने चाहिए'),
  body('passingMarks')
    .isNumeric()
    .withMessage('पासिंग अंक संख्या होने चाहिए'),
];

exports.addQuestion = [
  body('testId')
    .isMongoId()
    .withMessage('अमान्य टेस्ट ID'),
  body('questionText')
    .notEmpty()
    .withMessage('प्रश्न का पाठ आवश्यक है'),
  body('options')
    .isArray({ min: 2 })
    .withMessage('कम से कम दो विकल्प होने चाहिए'),
  body('correctAnswer')
    .isNumeric()
    .withMessage('सही उत्तर का इंडेक्स होना चाहिए'),
  body('marks')
    .optional()
    .isNumeric()
    .withMessage('अंक संख्या होनी चाहिए'),
];

exports.enrollCourse = [
  param('id')
    .isMongoId()
    .withMessage('अमान्य कोर्स ID'),
];

exports.markLessonComplete = [
  param('courseId')
    .isMongoId()
    .withMessage('अमान्य कोर्स ID'),
  body('lessonId')
    .isMongoId()
    .withMessage('अमान्य पाठ ID'),
];