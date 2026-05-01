const express = require('express');
const router = express.Router();
const healthcareController = require('../controllers/healthcare.controller');
const { protect, authorize } = require('../middleware');
const upload = require('../middleware/upload');

// Doctor Availability
router.post('/availability', protect, authorize('DOCTOR'), healthcareController.setDoctorAvailability);
router.get('/availability/:doctorId', protect, healthcareController.getDoctorAvailability);
router.get('/slots', protect, healthcareController.getAvailableSlots);

// Appointments
router.post('/appointments', protect, healthcareController.bookAppointment);
router.put('/appointments/:id', protect, healthcareController.updateAppointmentStatus);
router.get('/appointments/patient', protect, healthcareController.getPatientAppointments);
router.get('/appointments/doctor', protect, authorize('DOCTOR'), healthcareController.getDoctorAppointments);
router.get('/appointments/:id', protect, healthcareController.getAppointmentById);

// Prescriptions
router.post('/prescriptions', protect, authorize('DOCTOR'), healthcareController.createPrescription);

// 🆕 FIX: Optional patientId ke liye do separate routes
router.get('/prescriptions/patient', protect, healthcareController.getPatientPrescriptions); // logged-in user ke liye
router.get('/prescriptions/patient/:patientId', protect, healthcareController.getPatientPrescriptions); // specific patient (doctor/admin)
router.get("/doctor/patients", protect, healthcareController.searchDoctorPatients);
router.get('/prescriptions/:id', protect, healthcareController.getPrescriptionById);

// Health Records
router.post('/records', protect, upload.array('attachments', 5), healthcareController.addHealthRecord);

// 🆕 FIX: Same for health records
router.get('/records/patient', protect, healthcareController.getPatientHealthRecords);
router.get('/records/patient/:patientId', protect, healthcareController.getPatientHealthRecords);

router.get('/records/:id', protect, healthcareController.getHealthRecordById);
router.delete('/records/:id', protect, healthcareController.deleteHealthRecord);

// Search
router.get('/doctors/search', protect, healthcareController.searchDoctors);
router.get("/doctor/dashboard", protect, healthcareController.getDoctorDashboard);

module.exports = router;