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

// ====================== 课程 CRUD（教师/管理员） ======================
exports.createCourse = async (req, res) => {
  try {
    const { title, description, price, category, language } = req.body;
    const course = await Course.create({
      title,
      description,
      price,
      category,
      language,
      instructor: req.user.id,
      thumbnail: req.file?.filename ? `/uploads/courses/${req.file.filename}` : null
    });
    res.status(201).json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user.id }).sort('-createdAt');
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user.id },
      req.body,
      { new: true }
    );
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ _id: req.params.id, instructor: req.user.id });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    // 级联删除章节、课时等（可选）
    res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== 章节与课时管理 ======================
exports.addChapter = async (req, res) => {
  try {
    const { courseId, title, order } = req.body;
    const course = await Course.findOne({ _id: courseId, instructor: req.user.id });
    if (!course) return res.status(403).json({ success: false, message: 'Not authorized' });
    const chapter = await Chapter.create({ course: courseId, title, order });
    res.status(201).json({ success: true, chapter });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.addLesson = async (req, res) => {
  try {
    const { chapterId, title, type, content, order, isPreview } = req.body;
    const chapter = await Chapter.findById(chapterId).populate('course');
    if (!chapter || chapter.course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== 测试管理 ======================
exports.createTest = async (req, res) => {
  try {
    const { courseId, title, description, duration, totalMarks, passingMarks } = req.body;
    const course = await Course.findOne({ _id: courseId, instructor: req.user.id });
    if (!course) return res.status(403).json({ success: false, message: 'Not authorized' });
    const test = await Test.create({
      course: courseId,
      title,
      description,
      duration,
      totalMarks,
      passingMarks
    });
    res.status(201).json({ success: true, test });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.addQuestion = async (req, res) => {
  try {
    const { testId, questionText, options, correctAnswer, marks, explanation } = req.body;
    const test = await Test.findById(testId).populate('course');
    if (!test || test.course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== 学生浏览与注册 ======================
exports.getPublishedCourses = async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = { isPublished: true };
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };
    const courses = await Course.find(query).populate('instructor', 'fullName').select('-__v');
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCourseDetails = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'fullName');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    const chapters = await Chapter.find({ course: course._id }).sort('order');
    const lessons = await Lesson.find({ chapter: { $in: chapters.map(c => c._id) } }).sort('order');
    const isEnrolled = req.user
      ? !!(await Enrollment.findOne({ student: req.user.id, course: course._id }))
      : false;
    res.json({ success: true, course, chapters, lessons, isEnrolled });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    // 付费课程需验证支付（此处简化）
    if (course.price > 0) {
      // 假设前端已处理支付
    }
    const enrollment = await Enrollment.findOneAndUpdate(
      { student: req.user.id, course: course._id },
      {},
      { upsert: true, new: true }
    );
    await Course.findByIdAndUpdate(course._id, { $inc: { totalEnrolled: 1 } });
    res.json({ success: true, enrollment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== 学习进度 ======================
exports.markLessonComplete = async (req, res) => {
  try {
    const { lessonId } = req.body;
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.courseId
    });
    if (!enrollment) return res.status(403).json({ success: false, message: 'Not enrolled' });
    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
      const totalLessons = await Lesson.countDocuments({
        chapter: { $in: await Chapter.find({ course: req.params.courseId }).distinct('_id') }
      });
      enrollment.progress = (enrollment.completedLessons.length / totalLessons) * 100;
      if (enrollment.progress === 100) {
        enrollment.completedAt = new Date();
      }
      await enrollment.save();
    }
    res.json({ success: true, progress: enrollment.progress });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== 测试提交与证书 ======================
exports.startTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    const enrollment = await Enrollment.findOne({ student: req.user.id, course: test.course });
    if (!enrollment) return res.status(403).json({ success: false, message: 'Not enrolled' });
    const attempt = await TestAttempt.create({
      test: test._id,
      student: req.user.id,
      startedAt: new Date()
    });
    const questions = await Question.find({ test: test._id }).select('-correctAnswer');
    res.json({ success: true, attempt, questions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const { attemptId, answers } = req.body;
    const attempt = await TestAttempt.findById(attemptId).populate('test');
    if (!attempt || attempt.student.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Invalid attempt' });
    }
    const questions = await Question.find({ test: attempt.test._id });
    let score = 0;
    answers.forEach(ans => {
      const q = questions.find(q => q._id.toString() === ans.question);
      if (q && q.correctAnswer === ans.selectedOption) score += q.marks;
    });
    const percentage = (score / attempt.test.totalMarks) * 100;
    const passed = percentage >= attempt.test.passingMarks;
    attempt.answers = answers;
    attempt.score = score;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.submittedAt = new Date();
    await attempt.save();

    // 生成证书（如果通过且课程进度100%）
    if (passed) {
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: attempt.test.course
      });
      if (enrollment && enrollment.progress === 100) {
        const certNumber = crypto.randomBytes(8).toString('hex').toUpperCase();
        const certificate = await Certificate.create({
          enrollment: enrollment._id,
          student: req.user.id,
          course: attempt.test.course,
          certificateNumber: certNumber,
          verificationCode: crypto.randomBytes(6).toString('hex')
        });
        attempt.certificateUrl = `/certificates/${certificate._id}.pdf`;
        await attempt.save();
        enrollment.certificateIssued = true;
        await enrollment.save();
      }
    }
    res.json({ success: true, score, percentage, passed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ====================== 教师仪表盘 ======================
exports.getInstructorDashboard = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user.id });
    const courseIds = courses.map(c => c._id);
    const totalStudents = await Enrollment.countDocuments({ course: { $in: courseIds } });
    const recentEnrollments = await Enrollment.find({ course: { $in: courseIds } })
      .populate('student', 'fullName email')
      .populate('course', 'title')
      .sort('-enrolledAt')
      .limit(10);
    res.json({
      success: true,
      totalCourses: courses.length,
      totalStudents,
      totalRevenue: 0, // 可从支付记录统计
      recentEnrollments
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};