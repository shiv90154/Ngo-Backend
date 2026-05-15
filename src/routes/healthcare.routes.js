// routes/healthcare.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const healthcareController = require('../controllers/healthcare.controller');
const validate = require('../middleware/validate');
const hVal = require('../validators/healthcareValidator');
const upload = require('../middleware/upload');

// ─── डॉक्टर अवेलेबिलिटी ───
router.post(
  '/availability',
  protect,
  restrictTo('DOCTOR'),
  validate(hVal.setAvailability),
  healthcareController.setDoctorAvailability
);
router.get('/availability/:doctorId', protect, healthcareController.getDoctorAvailability);
router.get('/slots', protect, healthcareController.getAvailableSlots);

// ─── अपॉइंटमेंट ───
router.post(
  '/appointments',
  protect,
  validate(hVal.bookAppointment),
  healthcareController.bookAppointment
);
router.put('/appointments/:id', protect, healthcareController.updateAppointmentStatus);
router.get('/appointments/patient', protect, healthcareController.getPatientAppointments);
router.get(
  '/appointments/doctor',
  protect,
  restrictTo('DOCTOR'),
  healthcareController.getDoctorAppointments
);
router.get('/appointments/:id', protect, healthcareController.getAppointmentById);
// ─── प्रिस्क्रिप्शन ───
router.post(
  '/prescriptions',
  protect,
  restrictTo('DOCTOR'),
  validate(hVal.createPrescription),
  healthcareController.createPrescription
);
// दो अलग routes – optional parameter को replace किया
router.get('/prescriptions/patient', protect, healthcareController.getPatientPrescriptions);
router.get('/prescriptions/patient/:patientId', protect, healthcareController.getPatientPrescriptions);
// specific के बाद parameterized route
router.get('/prescriptions/:id', protect, healthcareController.getPrescriptionById);
router.get('/prescriptions/:id/order-items', protect, healthcareController.orderFromPrescription);

// ─── हेल्थ रिकॉर्ड ───
router.post(
  '/records',
  protect,
  upload.fields([{ name: 'attachments', maxCount: 5 }]),
  validate(hVal.addHealthRecord),
  healthcareController.addHealthRecord
);
// दो अलग routes – optional parameter को replace किया
router.get('/records/patient', protect, healthcareController.getPatientHealthRecords);
router.get('/records/patient/:patientId', protect, healthcareController.getPatientHealthRecords);
// specific के बाद parameterized route
router.get('/records/:id', protect, healthcareController.getHealthRecordById);
router.delete('/records/:id', protect, healthcareController.deleteHealthRecord);

// ─── डॉक्टर सर्च और वेरिफिकेशन ───
router.get('/doctors/search', protect, healthcareController.searchDoctors);
router.get('/doctors/:id', protect, healthcareController.getDoctorById);
router.get(
  '/doctors/pending',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  healthcareController.getPendingDoctors
);
router.put(
  '/doctors/verify/:doctorId',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  healthcareController.verifyDoctor
);
router.put(
  '/doctors/reject/:doctorId',
  protect,
  restrictTo('SUPER_ADMIN', 'ADDITIONAL_DIRECTOR'),
  healthcareController.rejectDoctor
);

// ─── डैशबोर्ड और पेशेंट्स ───
router.get(
  '/doctor/dashboard',
  protect,
  restrictTo('DOCTOR'),
  healthcareController.getDoctorDashboard
);
router.get(
  '/doctor/patients',
  protect,
  restrictTo('DOCTOR'),
  healthcareController.getDoctorPatients
);

module.exports = router;