const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const contributionController = require('../controllers/contribution.controller');

router.post('/record', protect, contributionController.recordContribution);

module.exports = router;