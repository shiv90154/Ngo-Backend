const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const HealthRecord = require('../models/HealthRecord');
const DoctorAvailability = require('../models/DoctorAvailability');
const User = require('../models/user.model');
const Medicine = require('../models/Medicine');
const path = require('path');
const fs = require('fs').promises;
const mailer = require('../utils/sendEmail');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const uploadDir = path.join(__dirname, '../uploads/healthcare');
fs.mkdir(uploadDir, { recursive: true }).catch(() => {});

// ─── AVAILABILITY ──────────────────────────────────────────────
exports.setDoctorAvailability = catchAsync(async (req, res, next) => {
  const doctorId = req.user.id;
  const { workingDays, timeSlots, unavailableDates, consultationModes, isAcceptingAppointments } = req.body;

  // Verify user is a doctor (already protected by restrictTo middleware)
  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== 'DOCTOR') {
    throw new AppError('केवल डॉक्टर ही उपलब्धता सेट कर सकते हैं', 403);
  }

  let availability = await DoctorAvailability.findOne({ doctorId });
  if (!availability) availability = new DoctorAvailability({ doctorId });

  if (workingDays) availability.workingDays = workingDays;
  if (timeSlots) availability.timeSlots = timeSlots;
  if (unavailableDates) availability.unavailableDates = unavailableDates;
  if (consultationModes) availability.consultationModes = consultationModes;
  if (isAcceptingAppointments !== undefined) availability.isAcceptingAppointments = isAcceptingAppointments;

  availability.updatedBy = req.user.id;
  await availability.save();

  res.json({ success: true, message: 'उपलब्धता अपडेट की गई', availability });
});

exports.getDoctorAvailability = catchAsync(async (req, res, next) => {
  const { doctorId } = req.params;
  const availability = await DoctorAvailability.findOne({ doctorId });
  if (!availability) throw new AppError('उपलब्धता सेट नहीं की गई', 404);
  res.json({ success: true, availability });
});

exports.getAvailableSlots = catchAsync(async (req, res, next) => {
  const { doctorId, date } = req.query;
  if (!doctorId || !date) throw new AppError('डॉक्टर ID और तारीख आवश्यक है', 400);

  const appointmentDate = new Date(date);
  const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  const availability = await DoctorAvailability.findOne({ doctorId });
  if (!availability) return res.json({ success: true, slots: [] });

  const isUnavailable = availability.unavailableDates.some(
    u => new Date(u.date).toDateString() === appointmentDate.toDateString()
  );
  if (isUnavailable) return res.json({ success: true, slots: [], message: 'डॉक्टर इस तारीख को उपलब्ध नहीं हैं' });

  const daySlot = availability.timeSlots.find(s => s.day === dayOfWeek);
  if (!daySlot) return res.json({ success: true, slots: [] });

  const bookedAppointments = await Appointment.find({
    doctorId,
    appointmentDate: {
      $gte: new Date(appointmentDate.setHours(0, 0, 0)),
      $lt: new Date(appointmentDate.setHours(23, 59, 59)),
    },
    status: { $in: ['pending', 'confirmed'] },
  }).select('timeSlot');

  const slots = [];
  const timeToMinutes = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const startMin = timeToMinutes(daySlot.startTime);
  const endMin = timeToMinutes(daySlot.endTime);
  const duration = daySlot.slotDuration;

  for (let mins = startMin; mins < endMin; mins += duration) {
    const slotStart = `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
    const slotEnd = `${Math.floor((mins + duration) / 60).toString().padStart(2, '0')}:${((mins + duration) % 60).toString().padStart(2, '0')}`;
    const bookedCount = bookedAppointments.filter(b => b.timeSlot.start === slotStart).length;
    if (bookedCount < daySlot.maxAppointmentsPerSlot) {
      slots.push({ start: slotStart, end: slotEnd, available: daySlot.maxAppointmentsPerSlot - bookedCount });
    }
  }

  res.json({ success: true, slots });
});

// ─── APPOINTMENTS ───────────────────────────────────────────────
exports.bookAppointment = catchAsync(async (req, res, next) => {
  const { doctorId, appointmentDate, timeSlot, consultationType, symptoms, notes, paymentMethod } = req.body;
  const patientId = req.user.id;

  const doctor = await User.findOne({ _id: doctorId, role: 'DOCTOR' });
  if (!doctor) throw new AppError('डॉक्टर नहीं मिले', 404);

  const availability = await DoctorAvailability.findOne({ doctorId });
  if (!availability || !availability.isAcceptingAppointments) {
    throw new AppError('डॉक्टर अपॉइंटमेंट नहीं ले रहे', 400);
  }
  if (!availability.consultationModes[consultationType]) {
    throw new AppError(`${consultationType} परामर्श उपलब्ध नहीं`, 400);
  }

  const date = new Date(appointmentDate);
  const existing = await Appointment.findOne({
    doctorId,
    appointmentDate: {
      $gte: new Date(date.setHours(0, 0, 0)),
      $lt: new Date(date.setHours(23, 59, 59)),
    },
    'timeSlot.start': timeSlot.start,
    status: { $in: ['pending', 'confirmed'] },
  });
  if (existing) throw new AppError('यह स्लॉट पहले ही बुक हो चुका है', 400);

  const appointment = new Appointment({
    patientId,
    doctorId,
    appointmentDate,
    timeSlot,
    consultationType,
    symptoms,
    notes,
    payment: {
      amount: doctor.doctorProfile?.consultationFee || 0,
      status: 'pending',
      paymentMethod,
    },
    createdBy: patientId,
  });
  await appointment.save();

  await appointment.populate('patientId', 'fullName email phone');
  await appointment.populate('doctorId', 'fullName email doctorProfile');

  try {
    await mailer.sendAppointmentConfirmation(
      appointment.patientId.email,
      appointment.patientId.fullName,
      doctor.fullName,
      appointmentDate,
      timeSlot.start
    );
  } catch (emailErr) {
    console.error('Appointment email failed:', emailErr.message);
  }

  res.status(201).json({ success: true, message: 'अपॉइंटमेंट बुक हो गया', appointment });
});

exports.updateAppointmentStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status, cancellationReason, meetingLink, roomId } = req.body;

  const appointment = await Appointment.findById(id);
  if (!appointment) throw new AppError('अपॉइंटमेंट नहीं मिला', 404);

  const isAuthorized = req.user.role === 'SUPER_ADMIN' ||
    req.user.id === appointment.patientId.toString() ||
    req.user.id === appointment.doctorId.toString();
  if (!isAuthorized) throw new AppError('अनधिकृत', 403);

  if (req.user.id === appointment.patientId.toString() && status && status !== 'cancelled') {
    throw new AppError('मरीज केवल रद्द कर सकता है', 403);
  }

  appointment.status = status || appointment.status;
  if (cancellationReason) appointment.cancellationReason = cancellationReason;
  if (meetingLink) appointment.meetingLink = meetingLink;
  if (roomId) appointment.roomId = roomId;
  appointment.updatedBy = req.user.id;
  if (status === 'cancelled') appointment.cancelledBy = req.user.id;

  await appointment.save();
  res.json({ success: true, message: 'अपॉइंटमेंट अपडेट किया गया', appointment });
});

exports.getPatientAppointments = catchAsync(async (req, res, next) => {
  const patientId = req.user.id;
  const { status, page = 1, limit = 10 } = req.query;
  const filter = { patientId };
  if (status) filter.status = status;

  const appointments = await Appointment.find(filter)
    .populate('doctorId', 'fullName email doctorProfile profileImage')
    .populate('prescriptionId')
    .sort({ appointmentDate: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Appointment.countDocuments(filter);
  res.json({
    success: true,
    appointments,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
    total,
  });
});

exports.getDoctorAppointments = catchAsync(async (req, res, next) => {
  const doctorId = req.user.id;
  const { status, date, page = 1, limit = 10 } = req.query;
  const filter = { doctorId };
  if (status) filter.status = status;
  if (date) {
    const filterDate = new Date(date);
    filter.appointmentDate = {
      $gte: new Date(filterDate.setHours(0, 0, 0)),
      $lt: new Date(filterDate.setHours(23, 59, 59)),
    };
  }

  const appointments = await Appointment.find(filter)
    .populate('patientId', 'fullName email phone profileImage')
    .sort({ appointmentDate: 1, 'timeSlot.start': 1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Appointment.countDocuments(filter);
  res.json({
    success: true,
    appointments,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
    total,
  });
});

exports.getAppointmentById = catchAsync(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patientId', 'fullName email phone profileImage')
    .populate('doctorId', 'fullName email doctorProfile profileImage')
    .populate('prescriptionId');

  if (!appointment) throw new AppError('अपॉइंटमेंट नहीं मिला', 404);

  const isAuthorized = req.user.role === 'SUPER_ADMIN' ||
    req.user.id === appointment.patientId.toString() ||
    req.user.id === appointment.doctorId.toString();
  if (!isAuthorized) throw new AppError('अनधिकृत', 403);

  res.json({ success: true, appointment });
});

// ─── PRESCRIPTIONS ──────────────────────────────────────────────
exports.createPrescription = catchAsync(async (req, res, next) => {
  const doctorId = req.user.id;
  const { patientId, appointmentId, diagnosis, medicines, tests, advice, followUpDate } = req.body;

  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== 'DOCTOR') throw new AppError('केवल डॉक्टर ही पर्ची बना सकते हैं', 403);

  const prescription = new Prescription({
    patientId,
    doctorId,
    appointmentId,
    diagnosis,
    medicines,
    tests,
    advice,
    followUpDate,
    createdBy: doctorId,
    sharedWithPatient: true,
  });
  await prescription.save();

  if (appointmentId) {
    await Appointment.findByIdAndUpdate(appointmentId, { $set: { prescriptionId: prescription._id } });
  }
  await User.findByIdAndUpdate(patientId, { $push: { prescriptions: prescription._id } });

  await prescription.populate('patientId', 'fullName email');
  await prescription.populate('doctorId', 'fullName doctorProfile');

  try {
    await mailer.sendPrescriptionNotification(prescription.patientId.email, prescription.patientId.fullName, doctor.fullName);
  } catch (emailErr) {
    console.error('Prescription email failed:', emailErr.message);
  }

  res.status(201).json({ success: true, message: 'पर्ची बना दी गई', prescription });
});

exports.getPatientPrescriptions = catchAsync(async (req, res, next) => {
  const patientId = req.params.patientId || req.user.id;
  const { page = 1, limit = 10 } = req.query;

  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'DOCTOR' && req.user.id !== patientId) {
    throw new AppError('अनधिकृत', 403);
  }

  const prescriptions = await Prescription.find({ patientId })
    .populate('doctorId', 'fullName doctorProfile')
    .populate('appointmentId', 'appointmentDate consultationType')
    .sort({ prescriptionDate: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Prescription.countDocuments({ patientId });
  res.json({
    success: true,
    prescriptions,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
    total,
  });
});

exports.getPrescriptionById = catchAsync(async (req, res, next) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patientId', 'fullName email phone dob gender')
    .populate('doctorId', 'fullName doctorProfile profileImage');

  if (!prescription) throw new AppError('पर्ची नहीं मिली', 404);

  const isAuthorized = req.user.role === 'SUPER_ADMIN' ||
    req.user.id === prescription.patientId.toString() ||
    req.user.id === prescription.doctorId.toString();
  if (!isAuthorized) throw new AppError('अनधिकृत', 403);

  res.json({ success: true, prescription });
});

// ─── HEALTH RECORDS ─────────────────────────────────────────────
exports.addHealthRecord = catchAsync(async (req, res, next) => {
  const { patientId, recordType, title, description, date, doctorId, hospitalName, vitalSigns, labResults, isPrivate, tags } = req.body;
  const targetPatientId = patientId || req.user.id;

  if (req.user.role !== 'DOCTOR' && req.user.role !== 'SUPER_ADMIN' && req.user.id !== targetPatientId) {
    throw new AppError('अनधिकृत', 403);
  }

  const healthRecord = new HealthRecord({
    patientId: targetPatientId,
    recordType,
    title,
    description,
    date: date || new Date(),
    doctorId: doctorId || (req.user.role === 'DOCTOR' ? req.user.id : null),
    hospitalName,
    vitalSigns,
    labResults,
    isPrivate,
    tags,
    createdBy: req.user.id,
  });

  if (req.files?.attachments) {
    for (const file of req.files.attachments) {
      const ext = path.extname(file.originalname);
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}${ext}`;
      const newPath = path.join(uploadDir, fileName);
      await fs.rename(file.path, newPath);
      healthRecord.attachments.push({
        fileUrl: `/uploads/healthcare/${fileName}`,
        fileName: file.originalname,
        fileType: file.mimetype,
      });
    }
  }

  await healthRecord.save();

  await User.findByIdAndUpdate(targetPatientId, {
    $push: {
      healthRecords: {
        recordType,
        title,
        description,
        fileUrl: healthRecord.attachments[0]?.fileUrl,
        date: healthRecord.date,
        doctorId: healthRecord.doctorId,
      },
    },
  });

  res.status(201).json({ success: true, message: 'हेल्थ रिकॉर्ड जोड़ा गया', healthRecord });
});

exports.getPatientHealthRecords = catchAsync(async (req, res, next) => {
  const patientId = req.params.patientId || req.user.id;
  const { recordType, page = 1, limit = 20 } = req.query;

  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'DOCTOR' && req.user.id !== patientId) {
    throw new AppError('अनधिकृत', 403);
  }

  const filter = { patientId };
  if (recordType) filter.recordType = recordType;

  if (req.user.role === 'DOCTOR' && req.user.id !== patientId) {
    filter.$or = [{ isPrivate: false }, { doctorId: req.user.id }];
  }

  const records = await HealthRecord.find(filter)
    .populate('doctorId', 'fullName doctorProfile')
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await HealthRecord.countDocuments(filter);
  res.json({
    success: true,
    records,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
    total,
  });
});

exports.getHealthRecordById = catchAsync(async (req, res, next) => {
  const record = await HealthRecord.findById(req.params.id)
    .populate('patientId', 'fullName email')
    .populate('doctorId', 'fullName doctorProfile');
  if (!record) throw new AppError('रिकॉर्ड नहीं मिला', 404);

  const isAuthorized = req.user.role === 'SUPER_ADMIN' ||
    req.user.id === record.patientId.toString() ||
    (req.user.role === 'DOCTOR' && (!record.isPrivate || req.user.id === record.doctorId?.toString()));
  if (!isAuthorized) throw new AppError('अनधिकृत', 403);

  res.json({ success: true, record });
});

exports.deleteHealthRecord = catchAsync(async (req, res, next) => {
  const record = await HealthRecord.findById(req.params.id);
  if (!record) throw new AppError('रिकॉर्ड नहीं मिला', 404);

  if (req.user.role !== 'SUPER_ADMIN' && req.user.id !== record.patientId.toString()) {
    throw new AppError('अनधिकृत', 403);
  }

  for (const attachment of record.attachments) {
    const filePath = path.join(__dirname, '..', attachment.fileUrl);
    await fs.unlink(filePath).catch(() => {});
  }

  await HealthRecord.findByIdAndDelete(req.params.id);
  await User.findByIdAndUpdate(record.patientId, { $pull: { healthRecords: { _id: record._id } } });

  res.json({ success: true, message: 'रिकॉर्ड हटा दिया गया' });
});

// ─── DOCTOR SEARCH & VERIFICATION ───────────────────────────────
exports.searchDoctors = catchAsync(async (req, res, next) => {
  const { specialization, state, district, page = 1, limit = 10 } = req.query;
  const filter = {
    role: 'DOCTOR',
    isVerified: true,
    isDeleted: false,
    'doctorVerification.verificationStatus': 'approved',
  };
  if (specialization) filter['doctorProfile.specialization'] = { $regex: specialization, $options: 'i' };
  if (state) filter.state = state;
  if (district) filter.district = district;

  const doctors = await User.find(filter)
    .select('fullName email phone profileImage doctorProfile state district')
    .sort({ 'doctorProfile.experienceYears': -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await User.countDocuments(filter);
  res.json({
    success: true,
    doctors,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
    total,
  });
});

exports.orderFromPrescription = catchAsync(async (req, res, next) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) throw new AppError('पर्ची नहीं मिली', 404);

  if (req.user.id !== prescription.patientId.toString() && req.user.role !== 'SUPER_ADMIN') {
    throw new AppError('अनधिकृत', 403);
  }

  const orderItems = [];
  for (const med of prescription.medicines) {
    const medicine = await Medicine.findOne({ name: med.name });
    if (medicine) {
      orderItems.push({
        medicine: medicine._id,
        name: medicine.name,
        quantity: 1,
        price: medicine.price,
      });
    }
  }
  if (orderItems.length === 0) throw new AppError('कोई मेल खाने वाली दवा नहीं मिली', 400);

  res.json({ success: true, items: orderItems, prescriptionId: prescription._id });
});

exports.getPendingDoctors = catchAsync(async (req, res, next) => {
  const doctors = await User.find({
    role: 'DOCTOR',
    'doctorVerification.verificationStatus': 'pending',
  }).select('fullName email phone doctorProfile doctorVerification');
  res.json({ success: true, doctors });
});

exports.verifyDoctor = catchAsync(async (req, res, next) => {
  const doctor = await User.findById(req.params.doctorId);
  if (!doctor || doctor.role !== 'DOCTOR') throw new AppError('डॉक्टर नहीं मिले', 404);

  doctor.doctorVerification.verificationStatus = 'approved';
  doctor.doctorVerification.verifiedBy = req.user.id;
  doctor.doctorVerification.verificationDate = new Date();
  await doctor.save();

  try { await mailer.sendDoctorVerificationApproved(doctor.email, doctor.fullName); } catch (e) {}

  res.json({ success: true, message: 'डॉक्टर सत्यापित' });
});

exports.rejectDoctor = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const doctor = await User.findById(req.params.doctorId);
  if (!doctor || doctor.role !== 'DOCTOR') throw new AppError('डॉक्टर नहीं मिले', 404);

  doctor.doctorVerification.verificationStatus = 'rejected';
  doctor.doctorVerification.rejectionReason = reason || 'कोई कारण नहीं';
  await doctor.save();
  res.json({ success: true, message: 'डॉक्टर अस्वीकृत' });
});

// ─── DASHBOARD & PATIENTS ───────────────────────────────────────
exports.getDoctorDashboard = catchAsync(async (req, res, next) => {
  const doctorId = req.user.id;

  const [totalAppointments, patientIds, totalPrescriptions, recentAppointments, revenueData] = await Promise.all([
    Appointment.countDocuments({ doctorId }),
    Appointment.distinct('patientId', { doctorId }),
    Prescription.countDocuments({ doctorId }),
    Appointment.find({ doctorId }).sort({ appointmentDate: -1 }).limit(5)
      .populate('patientId', 'fullName email phone profileImage')
      .lean(),
    Appointment.aggregate([
      { $match: { doctorId: new mongoose.Types.ObjectId(doctorId), status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$payment.amount' } } },
    ]),
  ]);

  res.json({
    success: true,
    stats: {
      totalAppointments,
      totalPatients: patientIds.length,
      totalPrescriptions,
      totalRevenue: revenueData[0]?.totalRevenue || 0,
    },
    recentAppointments,
  });
});

exports.getDoctorPatients = catchAsync(async (req, res, next) => {
  const doctorId = req.user.id;
  const { search, page = 1, limit = 20 } = req.query;

  const patientIds = await Appointment.distinct('patientId', { doctorId });
  let filter = { _id: { $in: patientIds } };
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const patients = await User.find(filter)
    .select('fullName email phone profileImage doctorProfile')
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const total = await User.countDocuments(filter);
  res.json({
    success: true,
    patients,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
    total,
  });
});