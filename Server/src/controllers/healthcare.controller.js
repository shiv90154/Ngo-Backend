const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const HealthRecord = require('../models/HealthRecord');
const DoctorAvailability = require('../models/DoctorAvailability');
const User = require('../models/user.model');
const path = require('path');
const fs = require('fs').promises;

const uploadDir = path.join(__dirname, '../uploads/healthcare');
(async () => {
  await fs.mkdir(uploadDir, { recursive: true });
})();

// ======================
// DOCTOR AVAILABILITY
// ======================

// Set/Update Doctor Availability
exports.setDoctorAvailability = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { workingDays, timeSlots, unavailableDates, consultationModes, isAcceptingAppointments } = req.body;

    // Verify user is a doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'DOCTOR') {
      return res.status(403).json({ success: false, message: 'Only doctors can set availability' });
    }

    let availability = await DoctorAvailability.findOne({ doctorId });

    if (!availability) {
      availability = new DoctorAvailability({ doctorId });
    }

    if (workingDays) availability.workingDays = workingDays;
    if (timeSlots) availability.timeSlots = timeSlots;
    if (unavailableDates) availability.unavailableDates = unavailableDates;
    if (consultationModes) availability.consultationModes = consultationModes;
    if (isAcceptingAppointments !== undefined) availability.isAcceptingAppointments = isAcceptingAppointments;

    availability.updatedBy = req.user.id;
    await availability.save();

    res.json({ success: true, message: 'Availability updated', availability });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Doctor Availability
exports.getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const availability = await DoctorAvailability.findOne({ doctorId });
    if (!availability) {
      return res.status(404).json({ success: false, message: 'Availability not set' });
    }
    res.json({ success: true, availability });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get available slots for a specific date
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ success: false, message: 'Doctor ID and date required' });
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const availability = await DoctorAvailability.findOne({ doctorId });
    if (!availability) {
      return res.json({ success: true, slots: [] });
    }

    // Check if doctor is unavailable on this date
    const isUnavailable = availability.unavailableDates.some(
      u => new Date(u.date).toDateString() === appointmentDate.toDateString()
    );
    if (isUnavailable) {
      return res.json({ success: true, slots: [], message: 'Doctor unavailable on this date' });
    }

    // Find time slot configuration for this day
    const daySlot = availability.timeSlots.find(s => s.day === dayOfWeek);
    if (!daySlot) {
      return res.json({ success: true, slots: [] });
    }

    // Get already booked appointments for this date
    const bookedAppointments = await Appointment.find({
      doctorId,
      appointmentDate: {
        $gte: new Date(appointmentDate.setHours(0, 0, 0)),
        $lt: new Date(appointmentDate.setHours(23, 59, 59)),
      },
      status: { $in: ['pending', 'confirmed'] },
    }).select('timeSlot');

    // Generate available slots
    const slots = [];
    const startTime = daySlot.startTime;
    const endTime = daySlot.endTime;
    const duration = daySlot.slotDuration;

    // Convert time to minutes for easier calculation
    const timeToMinutes = (timeStr) => {
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours !== 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    for (let mins = startMinutes; mins < endMinutes; mins += duration) {
      const slotStart = `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
      const slotEndMins = mins + duration;
      const slotEnd = `${Math.floor(slotEndMins / 60).toString().padStart(2, '0')}:${(slotEndMins % 60).toString().padStart(2, '0')}`;

      // Count bookings for this slot
      const bookedCount = bookedAppointments.filter(
        b => b.timeSlot.start === slotStart
      ).length;

      if (bookedCount < daySlot.maxAppointmentsPerSlot) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          available: daySlot.maxAppointmentsPerSlot - bookedCount,
        });
      }
    }

    res.json({ success: true, slots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// APPOINTMENTS
// ======================

// Book Appointment
exports.bookAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, timeSlot, consultationType, symptoms, notes, paymentMethod } = req.body;
    const patientId = req.user.id;

    // Validate doctor exists and is a doctor
    const doctor = await User.findOne({ _id: doctorId, role: 'DOCTOR' });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Check doctor availability
    const availability = await DoctorAvailability.findOne({ doctorId });
    if (!availability || !availability.isAcceptingAppointments) {
      return res.status(400).json({ success: false, message: 'Doctor not accepting appointments' });
    }

    // Validate consultation mode
    if (!availability.consultationModes[consultationType]) {
      return res.status(400).json({ success: false, message: `${consultationType} consultation not available` });
    }

    // Check if slot is available
    const date = new Date(appointmentDate);
    const existingBooking = await Appointment.findOne({
      doctorId,
      appointmentDate: {
        $gte: new Date(date.setHours(0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59)),
      },
      'timeSlot.start': timeSlot.start,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (existingBooking) {
      return res.status(400).json({ success: false, message: 'Slot already booked' });
    }

    // Create appointment
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
      createdBy: req.user.id,
    });

    await appointment.save();

    // Populate for response
    await appointment.populate('patientId', 'fullName email phone');
    await appointment.populate('doctorId', 'fullName email doctorProfile');

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update Appointment Status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason, meetingLink, roomId } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Authorization: only patient, doctor, or admin can update
    const isAuthorized = req.user.role === 'SUPER_ADMIN' ||
                         req.user.id === appointment.patientId.toString() ||
                         req.user.id === appointment.doctorId.toString();

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Patients can only cancel
    if (req.user.id === appointment.patientId.toString() && status && status !== 'cancelled') {
      return res.status(403).json({ success: false, message: 'Patients can only cancel appointments' });
    }

    appointment.status = status || appointment.status;
    if (cancellationReason) appointment.cancellationReason = cancellationReason;
    if (meetingLink) appointment.meetingLink = meetingLink;
    if (roomId) appointment.roomId = roomId;
    appointment.updatedBy = req.user.id;

    // If cancelled, record who cancelled
    if (status === 'cancelled') {
      appointment.cancelledBy = req.user.id;
    }

    await appointment.save();

    res.json({ success: true, message: 'Appointment updated', appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Patient's Appointments
exports.getPatientAppointments = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { patientId };
    if (status) filter.status = status;

    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'fullName email doctorProfile profileImage')
      .populate('prescriptionId')
      .sort({ appointmentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(filter);

    res.json({
      success: true,
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Doctor's Appointments
exports.getDoctorAppointments = async (req, res) => {
  try {
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
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(filter);

    res.json({
      success: true,
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Single Appointment
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'fullName email phone profileImage')
      .populate('doctorId', 'fullName email doctorProfile profileImage')
      .populate('prescriptionId');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Authorization
    const isAuthorized = req.user.role === 'SUPER_ADMIN' ||
                         req.user.id === appointment.patientId.toString() ||
                         req.user.id === appointment.doctorId.toString();

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// PRESCRIPTIONS
// ======================

// Create Prescription
exports.createPrescription = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { patientId, appointmentId, diagnosis, medicines, tests, advice, followUpDate } = req.body;

    // Verify doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'DOCTOR') {
      return res.status(403).json({ success: false, message: 'Only doctors can create prescriptions' });
    }

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

    // If appointment exists, link prescription
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        $set: { prescriptionId: prescription._id },
      });
    }

    // Also add to user's embedded prescriptions for quick access
    await User.findByIdAndUpdate(patientId, {
      $push: { prescriptions: prescription._id },
    });

    await prescription.populate('patientId', 'fullName email');
    await prescription.populate('doctorId', 'fullName doctorProfile');

    res.status(201).json({
      success: true,
      message: 'Prescription created',
      prescription,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Patient's Prescriptions
exports.getPatientPrescriptions = async (req, res) => {
  try {
    const patientId = req.params.patientId || req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Authorization: patient themselves or doctor/admin
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'DOCTOR' && req.user.id !== patientId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const prescriptions = await Prescription.find({ patientId })
      .populate('doctorId', 'fullName doctorProfile')
      .populate('appointmentId', 'appointmentDate consultationType')
      .sort({ prescriptionDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Prescription.countDocuments({ patientId });

    res.json({
      success: true,
      prescriptions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Single Prescription
exports.getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId', 'fullName email phone dob gender')
      .populate('doctorId', 'fullName doctorProfile profileImage');

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    // Authorization
    const isAuthorized = req.user.role === 'SUPER_ADMIN' ||
                         req.user.id === prescription.patientId.toString() ||
                         req.user.id === prescription.doctorId.toString();

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, prescription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// HEALTH RECORDS
// ======================

// Add Health Record
exports.addHealthRecord = async (req, res) => {
  try {
    const { patientId, recordType, title, description, date, doctorId, hospitalName, vitalSigns, labResults, isPrivate, tags } = req.body;
    const targetPatientId = patientId || req.user.id;

    // Authorization: patient can add own records, doctors can add for patients
    if (req.user.role !== 'DOCTOR' && req.user.role !== 'SUPER_ADMIN' && req.user.id !== targetPatientId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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

    // Handle file uploads
    if (req.files && req.files.attachments) {
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

    // Also add to user's embedded health records
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

    res.status(201).json({
      success: true,
      message: 'Health record added',
      healthRecord,
    });
  } catch (error) {
    // Cleanup uploaded files if error
    if (req.files) {
      for (const file of req.files.attachments || []) {
        await fs.unlink(file.path).catch(() => {});
      }
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Patient's Health Records
exports.getPatientHealthRecords = async (req, res) => {
  try {
    const patientId = req.params.patientId || req.user.id;
    const { recordType, page = 1, limit = 20 } = req.query;

    // Authorization
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'DOCTOR' && req.user.id !== patientId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const filter = { patientId };
    if (recordType) filter.recordType = recordType;

    // Doctors can only see non-private unless they are the attending doctor
    if (req.user.role === 'DOCTOR' && req.user.id !== patientId) {
      filter.$or = [{ isPrivate: false }, { doctorId: req.user.id }];
    }

    const records = await HealthRecord.find(filter)
      .populate('doctorId', 'fullName doctorProfile')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await HealthRecord.countDocuments(filter);

    res.json({
      success: true,
      records,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Single Health Record
exports.getHealthRecordById = async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id)
      .populate('patientId', 'fullName email')
      .populate('doctorId', 'fullName doctorProfile');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    // Authorization
    const isAuthorized = req.user.role === 'SUPER_ADMIN' ||
                         req.user.id === record.patientId.toString() ||
                         (req.user.role === 'DOCTOR' && (!record.isPrivate || req.user.id === record.doctorId?.toString()));

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete Health Record
exports.deleteHealthRecord = async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    // Only patient themselves or admin can delete
    if (req.user.role !== 'SUPER_ADMIN' && req.user.id !== record.patientId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete attached files
    for (const attachment of record.attachments) {
      const filePath = path.join(__dirname, '..', attachment.fileUrl);
      await fs.unlink(filePath).catch(() => {});
    }

    await HealthRecord.findByIdAndDelete(req.params.id);

    // Also remove from user's embedded array
    await User.findByIdAndUpdate(record.patientId, {
      $pull: { healthRecords: { _id: record._id } },
    });

    res.json({ success: true, message: 'Health record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================
// DOCTOR SEARCH
// ======================
exports.searchDoctors = async (req, res) => {
  try {
    const { specialization, state, district, page = 1, limit = 10 } = req.query;

    const filter = { role: 'DOCTOR', isVerified: true, isDeleted: false };
    if (specialization) filter['doctorProfile.specialization'] = { $regex: specialization, $options: 'i' };
    if (state) filter.state = state;
    if (district) filter.district = district;

    const doctors = await User.find(filter)
      .select('fullName email phone profileImage doctorProfile state district')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ 'doctorProfile.experienceYears': -1 });

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      doctors,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};