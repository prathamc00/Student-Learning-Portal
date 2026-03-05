const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp } = require('../controllers/otpController');

router.post('/send', sendOtp);
router.post('/verify', verifyOtp);

module.exports = router;
