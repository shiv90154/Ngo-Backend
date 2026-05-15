const { body, param, query } = require('express-validator');

exports.setAvailability = [
  body('workingDays').optional().isArray(),
  body('isAcceptingAppointments').optional().isBoolean(),
];

exports.bookAppointment = [
  body('doctorId').isMongoId().withMessage('अमान्य डॉक्टर ID'),
  body('appointmentDate').notEmpty().withMessage('तारीख आवश्यक है'),
  body('timeSlot.start').notEmpty(),
  body('consultationType').isIn(['video','audio','chat','in-person']),
];

exports.createPrescription = [
  body('patientId').isMongoId(),
  body('diagnosis').notEmpty().withMessage('डायग्नोसिस आवश्यक है'),
  body('medicines').isArray({ min: 1 }).withMessage('कम से कम एक दवा जोड़ें'),
];

exports.addHealthRecord = [
  body('recordType').isIn(['lab_report','diagnosis','vaccination','surgery','allergy','medication','vital_signs','imaging','other']),
  body('title').notEmpty(),
];