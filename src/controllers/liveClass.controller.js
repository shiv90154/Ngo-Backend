const LiveClass = require('../models/LiveClass');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { generateMeetingId } = require('../utils/meetingHelper'); 


exports.createLiveClass = async (req, res) => {
  try {
    const { courseId, title, description, startTime, endTime, maxParticipants } = req.body;
    const course = await Course.findOne({ _id: courseId, instructor: req.user.id });
    if (!course) return res.status(403).json({ success: false, message: 'Not authorized' });

    const meetingId = await generateMeetingId(); 

    const liveClass = await LiveClass.create({
      course: courseId,
      title,
      description,
      instructor: req.user.id,
      startTime,
      endTime,
      maxParticipants,
      meetingId,
      meetingPassword: Math.random().toString(36).slice(2, 10),
    });

  
    const enrollments = await Enrollment.find({ course: courseId }).select('student');
    liveClass.enrolledStudents = enrollments.map(e => e.student);
    await liveClass.save();

    res.status(201).json({ success: true, liveClass });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.getLiveClassesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const liveClasses = await LiveClass.find({ course: courseId }).sort('-startTime');
    res.json({ success: true, liveClasses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reserveLiveClass = async (req, res) => {
  try {
    const { liveClassId } = req.params;
    const liveClass = await LiveClass.findById(liveClassId);
    if (!liveClass) return res.status(404).json({ success: false, message: 'Live class not found' });

    
    const enrollment = await Enrollment.findOne({ student: req.user.id, course: liveClass.course });
    if (!enrollment) return res.status(403).json({ success: false, message: 'Must be enrolled in the course' });

    if (!liveClass.enrolledStudents.includes(req.user.id)) {
      liveClass.enrolledStudents.push(req.user.id);
      await liveClass.save();
    }
    res.json({ success: true, message: 'Reserved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.getLiveClassDetails = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id).populate('course', 'title');
    if (!liveClass) return res.status(404).json({ success: false, message: 'Not found' });


    const isInstructor = liveClass.instructor.toString() === req.user.id;
    const isEnrolledStudent = liveClass.enrolledStudents.includes(req.user.id);
    if (!isInstructor && !isEnrolledStudent) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // 返回会议凭证（如token）
    const credentials = {
      meetingId: liveClass.meetingId,
      meetingPassword: liveClass.meetingPassword,
    };
    res.json({ success: true, liveClass, credentials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.endLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findOne({ _id: req.params.id, instructor: req.user.id });
    if (!liveClass) return res.status(403).json({ success: false, message: 'Not authorized' });

    liveClass.status = 'ended';
    if (req.body.recordingUrl) liveClass.recordingUrl = req.body.recordingUrl;
    await liveClass.save();
    res.json({ success: true, liveClass });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};