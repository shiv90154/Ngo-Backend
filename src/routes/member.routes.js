const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware');
const memberController = require('../controllers/member.controller');
const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

const ALLOWED = ['SUPER_ADMIN', ...NGO_ORGANIZATIONAL_ROLES];

router.get('/', protect, restrictTo(...ALLOWED), memberController.getMembers);
router.patch('/:id/block', protect, restrictTo(...ALLOWED), memberController.blockMember);
router.patch('/:id/unblock', protect, restrictTo(...ALLOWED), memberController.unblockMember);
router.get('/:id/id-card', protect, restrictTo(...ALLOWED), memberController.getMemberIdCard);
router.get('/:id/certificate', protect, restrictTo(...ALLOWED), memberController.getMemberCertificate);

module.exports = router;