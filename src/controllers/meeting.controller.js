const Meeting = require('../models/Meeting');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');


exports.createMeeting = catchAsync(async (req, res, next) => {
  const { title, description, startTime, endTime, meetingLink, participants } = req.body;
  const meeting = await Meeting.create({
    title,
    description,
    host: req.user._id,
    startTime,
    endTime,
    meetingLink,
    participants: participants || [],
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, meeting });
});


exports.getAllMeetings = catchAsync(async (req, res, next) => {
  const meetings = await Meeting.find()
    .populate('host', 'fullName email')
    .populate('participants', 'fullName email role')
    .sort('-startTime');
  res.json({ success: true, meetings });
});


exports.getMeeting = catchAsync(async (req, res, next) => {
  const meeting = await Meeting.findById(req.params.id)
    .populate('host', 'fullName email')
    .populate('participants', 'fullName email role')
    .populate('messages.sender', 'fullName');
  if (!meeting) return next(new AppError('Meeting not found', 404));
  res.json({ success: true, meeting });
});


exports.updateMeeting = catchAsync(async (req, res, next) => {
  const meeting = await Meeting.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!meeting) return next(new AppError('Meeting not found', 404));
  res.json({ success: true, meeting });
});

exports.deleteMeeting = catchAsync(async (req, res, next) => {
  const meeting = await Meeting.findByIdAndDelete(req.params.id);
  if (!meeting) return next(new AppError('Meeting not found', 404));
  res.json({ success: true, message: 'Meeting deleted' });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return next(new AppError('Meeting not found', 404));
  meeting.messages.push({ sender: req.user._id, text: req.body.text });
  await meeting.save();
  res.json({ success: true, message: 'Message sent' });
});