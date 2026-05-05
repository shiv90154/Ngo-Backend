const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recordType: {
      type: String,
      enum: [
        'lab_report',
        'diagnosis',
        'vaccination',
        'surgery',
        'allergy',
        'medication',
        'vital_signs',
        'imaging',
        'other',
      ],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
    },
    description: String,
    date: {
      type: Date,
      default: Date.now,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    hospitalName: String,
    attachments: [
      {
        fileUrl: String,
        fileName: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    vitalSigns: {
      bloodPressure: String, // e.g., "120/80"
      heartRate: Number,     // bpm
      temperature: Number,   // Celsius
      respiratoryRate: Number,
      oxygenSaturation: Number, // SpO2 %
      height: Number,        // cm
      weight: Number,        // kg
      bmi: Number,
    },
    labResults: {
      testName: String,
      result: mongoose.Schema.Types.Mixed,
      normalRange: String,
      isAbnormal: Boolean,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    tags: [String], // For easy filtering
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

healthRecordSchema.index({ patientId: 1, date: -1 });
healthRecordSchema.index({ recordType: 1 });
healthRecordSchema.index({ doctorId: 1 });
healthRecordSchema.index({ tags: 1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);