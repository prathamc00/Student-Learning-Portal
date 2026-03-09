const express = require('express');
const router = express.Router();
const { sendEmailOtp, verifyEmailOtp } = require('../controllers/otpController');

router.post('/send-email', sendEmailOtp);
router.post('/verify-email', verifyEmailOtp);

module.exports = router;
