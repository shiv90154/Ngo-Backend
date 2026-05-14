// backend/seeds/seedPIShares.js
require('dotenv').config();
const mongoose = require('mongoose');
const PIShare = require('../models/PIShare');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/samridh_bharat';

const shares = [
  { role: 'ADDITIONAL_DIRECTOR', percentage: 3 },
  { role: 'STATE_DEVELOPMENT_COORDINATOR', percentage: 5 },
  { role: 'DISTRICT_BRANCH_MANAGER', percentage: 10 },
  { role: 'DISTRICT_PRESIDENT', percentage: 5 },
  { role: 'DISTRICT_FIELD_COORDINATOR', percentage: 5 },
  { role: 'BAMS_DOCTOR', percentage: 5 },
  { role: 'BLOCK_DEVELOPMENT_COORDINATOR', percentage: 5 },
  { role: 'GRAM_DEVELOPMENT_COORDINATOR', percentage: 10 },
  { role: 'NGO_CLUB', percentage: 50 },
  { role: 'USER', percentage: 5 },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  await PIShare.deleteMany({});
  for (const s of shares) {
    await PIShare.create(s);
    console.log(`✅ ${s.role}: ${s.percentage}%`);
  }
  console.log('PI Shares seeded');
  process.exit(0);
}
seed();