const Course = require('../models/Course');
const User = require('../models/user.model');
const MediaPost = require('../models/MediaPost');

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        results: {
          courses: [],
          doctors: [],
          news: [],
          users: [],
        },
      });
    }

    const regex = { $regex: q, $options: 'i' };

    const [courses, doctors, news, users] = await Promise.all([
      Course.find({ title: regex, isPublished: true })
        .select('title thumbnail category price instructor')
        .populate('instructor', 'fullName')
        .limit(5)
        .lean(),

      User.find({
        role: 'DOCTOR',
        isActive: true,
        isDeleted: false,
        $or: [
          { fullName: regex },
          { 'doctorProfile.specialization': regex },
        ],
      })
        .select('fullName profileImage doctorProfile')
        .limit(5)
        .lean(),

      MediaPost.find({ content: regex, isPublished: true })
        .select('content author createdAt')
        .populate('author', 'fullName')
        .limit(5)
        .lean(),

      User.find({
        isActive: true,
        isDeleted: false,
        fullName: regex,
      })
        .select('fullName profileImage role')
        .limit(5)
        .lean(),
    ]);

    res.json({
      success: true,
      results: {
        courses,
        doctors,
        news,
        users,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};