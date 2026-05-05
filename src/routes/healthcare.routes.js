const express = require('express');
const router = express.Router();
const healthcareController = require('../controllers/healthcare.controller');
const { protect, authorize } = require('../middleware');
const upload = require('../middleware/upload');

// ======================
// DOCTOR AVAILABILITY
// ======================
router.post('/availability', protect, authorize('DOCTOR'), healthcareController.setDoctorAvailability);
router.get('/availability/:doctorId', protect, healthcareController.getDoctorAvailability);
router.get('/slots', protect, healthcareController.getAvailableSlots);

// ======================
// APPOINTMENTS
// ======================
router.post('/appointments', protect, healthcareController.bookAppointment);
router.put('/appointments/:id', protect, healthcareController.updateAppointmentStatus);
router.get('/appointments/patient', protect, healthcareController.getPatientAppointments);
router.get('/appointments/doctor', protect, authorize('DOCTOR'), healthcareController.getDoctorAppointments);
router.get('/appointments/:id', protect, healthcareController.getAppointmentById);

// ======================
// PRESCRIPTIONS
// ======================
router.post('/prescriptions', protect, authorize('DOCTOR'), healthcareController.createPrescription);
router.get('/prescriptions/patient', protect, healthcareController.getPatientPrescriptions);
router.get('/prescriptions/patient/:patientId', protect, healthcareController.getPatientPrescriptions);
router.get('/prescriptions/:id/order-items', protect, healthcareController.orderFromPrescription);
router.get('/prescriptions/:id', protect, healthcareController.getPrescriptionById);

// ======================
// HEALTH RECORDS
// ======================
router.post('/records', protect, upload.array('attachments', 5), healthcareController.addHealthRecord);
router.get('/records/patient', protect, healthcareController.getPatientHealthRecords);
router.get('/records/patient/:patientId', protect, healthcareController.getPatientHealthRecords);
router.get('/records/:id', protect, healthcareController.getHealthRecordById);
router.delete('/records/:id', protect, healthcareController.deleteHealthRecord);

// ======================
// DOCTOR SEARCH
// ======================
router.get('/doctors/search', protect, healthcareController.searchDoctors);

// ======================
// DOCTOR DASHBOARD & PATIENTS (NEW)
// ======================
router.get('/doctor/dashboard', protect, authorize('DOCTOR'), healthcareController.getDoctorDashboard);
router.get('/doctor/patients', protect, authorize('DOCTOR'), healthcareController.getDoctorPatients);

// ======================
// DOCTOR VERIFICATION (ADMIN)
// ======================
router.get('/admin/doctors/pending', protect, authorize('SUPER_ADMIN'), healthcareController.getPendingDoctors);
router.put('/admin/doctors/verify/:doctorId', protect, authorize('SUPER_ADMIN'), healthcareController.verifyDoctor);
router.put('/admin/doctors/reject/:doctorId', protect, authorize('SUPER_ADMIN'), healthcareController.rejectDoctor);

module.exports = router;