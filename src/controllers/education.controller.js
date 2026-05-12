const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Lesson = require('../models/Lesson');
const Test = require('../models/Test');
const Question = require('../models/Question');
const TestAttempt = require('../models/TestAttempt');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const User = require('../models/user.model');
const crypto = require('crypto');
const { calculateCommission } = require('../services/mlmEngine');
const mailer = require('../utils/sendEmail');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const path = require("path");

// ====================== कोर्स CRUD (टीचर/एडमिन) ======================
exports.createCourse = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    price,
    category,
    language,
    isPublished,
  } = req.body;

  const thumbnail = req.file?.filename
    ? path.join(__dirname, "../../Server/src/uploads/courses", req.file.filename)
    : null;

  const course = await Course.create({
    title,
    description,
    price,
    category,
    language,
    isPublished: isPublished === "true" || isPublished === true,
    instructor: req.user.id,
    thumbnail,
  });

  res.status(201).json({
    success: true,
    course,
  });
});
exports.getMyCourses = catchAsync(async (req, res, next) => {
  const courses = await Course.find({ instructor: req.user.id })
    .sort('-createdAt');
  res.json({ success: true, courses });
});

exports.updateCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findOneAndUpdate(
    { _id: req.params.id, instructor: req.user.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!course) throw new AppError('कोर्स नहीं मिला', 404);
  res.json({ success: true, course });
});

exports.deleteCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findOneAndDelete({ _id: req.params.id, instructor: req.user.id });
  if (!course) throw new AppError('कोर्स नहीं मिला', 404);
  // सभी जुड़े डेटा डिलीट (चैप्टर, लेसंस, टेस्ट...)
  await Chapter.deleteMany({ course: course._id });
  await Lesson.deleteMany({ chapter: { $in: await Chapter.find({ course: course._id }).distinct('_id') } });
  await Test.deleteMany({ course: course._id });
  await Enrollment.deleteMany({ course: course._id });
  res.json({ success: true, message: 'कोर्स और संबंधित डेटा हटा दिया गया' });
});

// ====================== चैप्टर और पाठ प्रबंधन ======================
exports.addChapter = catchAsync(async (req, res, next) => {
  const { courseId, title, order } = req.body;
  const course = await Course.findOne({ _id: courseId, instructor: req.user.id });
  if (!course) throw new AppError('अनधिकृत या कोर्स नहीं मिला', 403);

  const chapter = await Chapter.create({ course: courseId, title, order });
  res.status(201).json({ success: true, chapter });
});

exports.addLesson = catchAsync(async (req, res, next) => {
  const { chapterId, title, type, content, order, isPreview } = req.body;
  const chapter = await Chapter.findById(chapterId).populate('course');
  if (!chapter || chapter.course.instructor.toString() !== req.user.id) {
    throw new AppError('अनधिकृत', 403);
  }
  const lesson = await Lesson.create({
    chapter: chapterId,
    title,
    type,
    content,
    order,
    isPreview
  });
  res.status(201).json({ success: true, lesson });
});

// ====================== टेस्ट प्रबंधन ======================
exports.createTest = catchAsync(async (req, res, next) => {
  const { courseId, title, description, duration, totalMarks, passingMarks } = req.body;
  const course = await Course.findOne({ _id: courseId, instructor: req.user.id });
  if (!course) throw new AppError('अनधिकृत', 403);

  const test = await Test.create({
    course: courseId,
    title,
    description,
    duration,
    totalMarks,
    passingMarks
  });
  res.status(201).json({ success: true, test });
});

exports.addQuestion = catchAsync(async (req, res, next) => {
  const { testId, questionText, options, correctAnswer, marks, explanation } = req.body;
  const test = await Test.findById(testId).populate('course');
  if (!test || test.course.instructor.toString() !== req.user.id) {
    throw new AppError('अनधिकृत', 403);
  }
  const question = await Question.create({
    test: testId,
    questionText,
    options,
    correctAnswer,
    marks,
    explanation
  });
  res.status(201).json({ success: true, question });
});

// ====================== स्टूडेंट ब्राउज़ और एनरोलमेंट ======================
exports.getPublishedCourses = catchAsync(async (req, res, next) => {
  const { category, search, page = 1, limit = 10 } = req.query;
  const query = { isPublished: true };
  if (category) query.category = category;
  if (search) query.title = { $regex: search, $options: 'i' };

  const courses = await Course.find(query)
    .populate('instructor', 'fullName')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Course.countDocuments(query);
  res.json({
    success: true,
    courses,
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / limit),
    total
  });
});

exports.getCourseDetails = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id).populate('instructor', 'fullName');
  if (!course) throw new AppError('कोर्स नहीं मिला', 404);

  const chapters = await Chapter.find({ course: course._id }).sort('order');
  const chapterIds = chapters.map(c => c._id);
  const lessons = await Lesson.find({ chapter: { $in: chapterIds } }).sort('order');

  let isEnrolled = false;
  if (req.user) {
    isEnrolled = !!(await Enrollment.findOne({ student: req.user.id, course: course._id }));
  }

  res.json({ success: true, course, chapters, lessons, isEnrolled });
});

exports.enrollCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('कोर्स नहीं मिला', 404);

  let enrollment = await Enrollment.findOne({ student: req.user.id, course: course._id });
  if (enrollment) {
    return res.json({ success: true, enrollment, message: 'पहले से एनरोल हैं' });
  }

  enrollment = await Enrollment.create({ student: req.user.id, course: course._id });
  await Course.findByIdAndUpdate(course._id, { $inc: { totalEnrolled: 1 } });

  // कमीशन (पेड कोर्स)
  if (course.price > 0) {
    await calculateCommission(req.user.id, course.price, 'course_enroll', enrollment._id);
  }

  // ईमेल भेजें
  try {
    const student = await User.findById(req.user.id);
    await mailer.sendCourseEnrollment(student.email, student.fullName, course.title);
  } catch (e) { console.error('एनरोलमेंट ईमेल विफल:', e.message); }

  res.status(201).json({ success: true, enrollment });
});

exports.getMyEnrollments = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const enrollments = await Enrollment.find({ student: req.user.id })
    .populate({
      path: 'course',
      select: 'title description thumbnail price instructor totalEnrolled',
      populate: { path: 'instructor', select: 'fullName' }
    })
    .sort('-enrolledAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const total = await Enrollment.countDocuments({ student: req.user.id });
  res.json({
    success: true,
    enrollments,
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / limit)
  });
});

exports.getMyCertificates = catchAsync(async (req, res, next) => {
  const certificates = await Certificate.find({ student: req.user.id })
    .populate('course', 'title')
    .sort('-issuedAt');
  res.json({ success: true, certificates });
});

// ====================== पढ़ाई की प्रगति ======================
exports.markLessonComplete = catchAsync(async (req, res, next) => {
  const { lessonId } = req.body;
  const enrollment = await Enrollment.findOne({
    student: req.user.id,
    course: req.params.courseId
  });
  if (!enrollment) throw new AppError('एनरोल नहीं हैं', 403);

  if (!enrollment.completedLessons.includes(lessonId)) {
    enrollment.completedLessons.push(lessonId);
    const chapters = await Chapter.find({ course: req.params.courseId });
    const totalLessons = await Lesson.countDocuments({ chapter: { $in: chapters.map(c => c._id) } });
    enrollment.progress = totalLessons ? (enrollment.completedLessons.length / totalLessons) * 100 : 0;
    if (enrollment.progress >= 100) {
      enrollment.completedAt = new Date();
    }
    await enrollment.save();
  }
  res.json({ success: true, progress: enrollment.progress });
});

// ====================== टेस्ट और सर्टिफिकेट ======================
exports.startTest = catchAsync(async (req, res, next) => {
  const test = await Test.findById(req.params.testId);
  if (!test) throw new AppError('टेस्ट नहीं मिला', 404);

  const enrollment = await Enrollment.findOne({ student: req.user.id, course: test.course });
  if (!enrollment) throw new AppError('पहले कोर्स में एनरोल करें', 403);

  // एक ही टेस्ट के लिए पुराने अनअटेम्प्ट हटा दें या चेक करें
  const existingAttempt = await TestAttempt.findOne({
    test: test._id,
    student: req.user.id,
    submittedAt: { $exists: false }
  });
  if (existingAttempt) {
    return res.json({ success: true, attempt: existingAttempt, message: 'पहले से शुरू किया हुआ टेस्ट' });
  }

  const attempt = await TestAttempt.create({
    test: test._id,
    student: req.user.id,
    startedAt: new Date()
  });
  const questions = await Question.find({ test: test._id }).select('-correctAnswer');

  res.json({ success: true, attempt, questions });
});

exports.submitTest = catchAsync(async (req, res, next) => {
  const { attemptId, answers } = req.body;
  const attempt = await TestAttempt.findById(attemptId).populate('test');
  if (!attempt || attempt.student.toString() !== req.user.id) {
    throw new AppError('अमान्य प्रयास', 403);
  }
  if (attempt.submittedAt) throw new AppError('टेस्ट पहले ही सबमिट हो चुका है', 400);

  const questions = await Question.find({ test: attempt.test._id });
  let score = 0;
  answers.forEach(ans => {
    const q = questions.find(q => q._id.toString() === ans.question);
    if (q && q.correctAnswer === ans.selectedOption) score += (q.marks || 1);
  });

  const percentage = (score / attempt.test.totalMarks) * 100;
  const passed = percentage >= attempt.test.passingMarks;

  attempt.answers = answers;
  attempt.score = score;
  attempt.percentage = percentage;
  attempt.passed = passed;
  attempt.submittedAt = new Date();
  await attempt.save();

  // सर्टिफिकेट जनरेशन
  if (passed) {
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: attempt.test.course
    });
    if (enrollment && enrollment.progress >= 100 && !enrollment.certificateIssued) {
      const certNumber = crypto.randomBytes(8).toString('hex').toUpperCase();
      await Certificate.create({
        enrollment: enrollment._id,
        student: req.user.id,
        course: attempt.test.course,
        certificateNumber: certNumber,
        verificationCode: crypto.randomBytes(6).toString('hex')
      });
      enrollment.certificateIssued = true;
      await enrollment.save();

      attempt.certificateUrl = `/certificates/${certNumber}.pdf`;
      await attempt.save();
    }
  }

  res.json({ success: true, score, percentage, passed });
});

// ====================== टीचर डैशबोर्ड ======================
exports.getInstructorDashboard = catchAsync(async (req, res, next) => {
  const courses = await Course.find({ instructor: req.user.id });
  const courseIds = courses.map(c => c._id);
  const totalStudents = await Enrollment.countDocuments({ course: { $in: courseIds } });

  const { page = 1, limit = 10 } = req.query;
  const recentEnrollments = await Enrollment.find({ course: { $in: courseIds } })
    .populate('student', 'fullName email')
    .populate('course', 'title')
    .sort('-enrolledAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    success: true,
    totalCourses: courses.length,
    totalStudents,
    recentEnrollments,
    currentPage: parseInt(page),
    totalRecentPages: Math.ceil(await Enrollment.countDocuments({ course: { $in: courseIds } }) / limit)
  });
});