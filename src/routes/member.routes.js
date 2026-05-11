// backend/src/routes/member.routes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const scopeFilter = require('../middleware/scopeFilter');
const memberController = require('../controllers/member.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

router.use(protect);
router.use(scopeFilter);   // req.scopeFilter set based on user's state/district/block/village

router.get('/', restrictTo(...ALLOWED), memberController.getMembers);
router.post('/', restrictTo(...ALLOWED), memberController.addMember);   // 🆕
router.patch('/:id/block', restrictTo(...ALLOWED), memberController.blockMember);
router.patch('/:id/unblock', restrictTo(...ALLOWED), memberController.unblockMember);
router.get('/:id/id-card', restrictTo(...ALLOWED), memberController.getMemberIdCard);
router.get('/:id/certificate', restrictTo(...ALLOWED), memberController.getMemberCertificate);

module.exports = router;